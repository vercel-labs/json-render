import process from "node:process";
import { Buffer } from "node:buffer";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const base = process.env.DOCS_TEST_URL;
if (!base) throw new Error("Set DOCS_TEST_URL to a running production build.");
const noindex = process.env.DOCS_EXPECT_NOINDEX === "1";
const origin = "https://json-render.dev";
const { pages } = JSON.parse(
  await readFile(
    new URL("./fixtures/docs-baseline.json", import.meta.url),
    "utf8",
  ),
);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const get = (path, options = {}) =>
  fetch(new URL(path, base), {
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
    ...options,
    headers: {
      "user-agent": "Mozilla/5.0",
      accept: "text/html",
      ...options.headers,
    },
  });
function rawGet(path, headers) {
  const url = new URL(path, base);
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        headers,
        signal: AbortSignal.timeout(30000),
      },
      (incoming) => {
        const chunks = [];
        incoming.on("data", (chunk) => chunks.push(chunk));
        incoming.on("error", reject);
        incoming.on("end", () => {
          const responseHeaders = new Headers();
          for (let i = 0; i < incoming.rawHeaders.length; i += 2) {
            responseHeaders.append(
              incoming.rawHeaders[i],
              incoming.rawHeaders[i + 1],
            );
          }
          resolve(
            new Response(Buffer.concat(chunks), {
              status: incoming.statusCode,
              headers: responseHeaders,
            }),
          );
        });
      },
    );
    request.on("error", reject);
    request.end();
  });
}
const decode = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
const attrs = (html, tag) =>
  [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "g"))].map(([value]) =>
    Object.fromEntries(
      [...value.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [
        m[1],
        decode(m[2]),
      ]),
    ),
  );
const meta = (html, key) =>
  attrs(html, "meta").find((tag) => tag.name === key || tag.property === key)
    ?.content;
const canonical = (html) =>
  attrs(html, "link").find((tag) => tag.rel === "canonical")?.href;
const contentType = (response) =>
  response.headers.get("content-type")?.split(";")[0];
function negotiationHeaders(response, html = false) {
  const tokens = (response.headers.get("vary") ?? "")
    .toLowerCase()
    .split(/\s*,\s*/);
  for (const name of [
    "accept",
    "user-agent",
    "signature-agent",
    "sec-fetch-mode",
    "sec-fetch-dest",
    "rsc",
    "next-router-prefetch",
    "next-router-segment-prefetch",
    "purpose",
    "sec-purpose",
    ...(html ? ["next-router-state-tree"] : []),
  ])
    assert.ok(tokens.includes(name), `${response.url}: missing Vary ${name}`);
  assert.match(response.headers.get("cache-control") ?? "", /private/);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("vercel-cdn-cache-control"), "no-store");
}

for (const page of pages) {
  test(`${page.path}: content and existing anchors survive migration`, async () => {
    const raw = await readFile(
      new URL(`../${page.file}`, import.meta.url),
      "utf8",
    );
    const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "");
    assert.equal(hash(page.prefix + body), page.sourceSha256);
    const response = await get(page.path);
    assert.equal(response.status, 200);
    assert.equal(contentType(response), "text/html");
    negotiationHeaders(response, true);
    const html = await response.text();
    assert.equal(canonical(html), `${origin}${page.path}`);
    assert.equal(
      decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""),
      page.metadataTitle,
    );
    assert.equal(meta(html, "og:url"), `${origin}${page.path}`);
    assert.equal(meta(html, "og:image"), `${origin}/og${page.path}`);
    assert.equal(html.match(/<h1(?:\s|>)/g)?.length, 1);
    assert.equal((meta(html, "robots") ?? "").includes("noindex"), noindex);
    if (noindex)
      assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
    for (const { id } of page.headings)
      assert.ok(html.includes(`id="${id}"`), `${page.path}: missing #${id}`);
  });
  test(`${page.path}: legacy, explicit and negotiated Markdown have exact parity`, async () => {
    for (const [path, headers] of [
      [`/api/docs-markdown?path=${encodeURIComponent(page.path)}`, {}],
      [`${page.path}.md`, {}],
      [page.path, { accept: "text/markdown" }],
    ]) {
      const response = await get(path, { headers });
      assert.equal(response.status, 200, path);
      assert.equal(contentType(response), "text/markdown");
      assert.equal(hash(await response.text()), page.markdownSha256, path);
      assert.equal(
        response.headers.get("link"),
        `<${origin}${page.path}>; rel="canonical"`,
      );
    }
  });
}

test("homepage, examples and playground keep public HTML routes", async () => {
  for (const path of ["/", "/examples", "/playground"]) {
    const response = await get(path, {
      headers: { accept: "text/markdown", "user-agent": "ClaudeBot/1.0" },
    });
    assert.equal(response.status, 200, path);
    assert.equal(contentType(response), "text/html");
    assert.equal(
      canonical(await response.text()),
      `${origin}${path === "/" ? "" : path}`,
    );
  }
});

test("public pages share one Geistdocs header, footer and provider", async () => {
  for (const path of [
    "/",
    "/examples",
    "/playground",
    "/docs",
    "/docs/api/core",
  ]) {
    const response = await get(path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.equal(attrs(html, "header").length, 1, path);
    assert.equal(attrs(html, "footer").length, 1, path);
    assert.equal(attrs(html, "main").length, 1, path);
    assert.equal(
      attrs(html, "div").filter(
        (tag) => tag["data-geistdocs-container"] === "true",
      ).length,
      1,
      path,
    );
    assert.ok(html.includes('aria-label="Primary navigation"'), path);
    assert.ok(html.includes('aria-label="GitHub repository"'), path);
    assert.ok(html.includes("Open Source Program"), path);
    if (path === "/playground") {
      assert.ok(
        attrs(html, "textarea").every(
          (tag) => !Object.hasOwn(tag, "autofocus"),
        ),
        "Playground focuses without scrolling the shared page",
      );
    }
  }
});

test("negotiation honors quality, browser previews and Next navigation", async () => {
  for (const [headers, type, suffix] of [
    [{ accept: "text/markdown;q=0,text/html" }, "text/html", ""],
    [{ accept: "text/markdown;q=0.5,text/html;q=1" }, "text/html", ""],
    [
      { accept: "*/*", "user-agent": "Slackbot-LinkExpanding 1.0" },
      "text/html",
      "",
    ],
    [{ accept: "*/*", "user-agent": "Discordbot/2.0" }, "text/html", ""],
    [{ accept: "*/*", "user-agent": "Googlebot/2.1" }, "text/html", ""],
    [{ accept: "*/*", "user-agent": "ClaudeBot/1.0" }, "text/markdown", ""],
    [
      { accept: "text/markdown", rsc: "1", "user-agent": "ClaudeBot/1.0" },
      "text/x-component",
      "?_rsc",
    ],
    [{ accept: "text/markdown", "next-router-prefetch": "1" }, "text/html", ""],
    [
      { accept: "text/markdown", "next-router-segment-prefetch": "/_tree" },
      "text/html",
      "",
    ],
    [{ accept: "text/markdown", purpose: "prefetch" }, "text/html", ""],
    [{ accept: "text/markdown", "sec-purpose": "prefetch" }, "text/html", ""],
    [
      {
        accept: "text/markdown",
        "sec-fetch-mode": "navigate",
        "sec-fetch-dest": "document",
      },
      "text/markdown",
      "",
    ],
    [
      {
        accept: "*/*",
        "user-agent": "ClaudeBot/1.0",
        "sec-fetch-mode": "navigate",
        "sec-fetch-dest": "document",
      },
      "text/html",
      "",
    ],
  ]) {
    const response = headers["sec-fetch-mode"]
      ? await rawGet(`/docs/installation${suffix}`, headers)
      : await get(`/docs/installation${suffix}`, { headers });
    assert.equal(response.status, 200);
    assert.equal(contentType(response), type, JSON.stringify(headers));
    negotiationHeaders(response, type !== "text/markdown");
    await response.body?.cancel();
  }
});

test("legacy and language aliases preserve permanent destinations", async () => {
  for (const [path, target] of [
    ["/docs/components", "/docs/registry"],
    ["/docs/actions", "/docs/registry#action-handlers"],
    ["/en/docs", "/docs"],
    ["/en/docs/api/core", "/docs/api/core"],
  ]) {
    const response = await get(path);
    assert.equal(response.status, 308, path);
    const location = new URL(response.headers.get("location"), base);
    assert.equal(location.pathname + location.hash, target);
    await response.body?.cancel();
  }
  const redirect = await get("/en/docs?utm_source=test&value=a%2Fb");
  assert.equal(
    new URL(redirect.headers.get("location"), base).search,
    "?utm_source=test&value=a%2Fb",
  );
  assert.equal(redirect.headers.get("set-cookie"), null);
});

test("unknown and malformed routes return real 404s", async () => {
  for (const path of [
    "/docs/missing",
    "/docs/missing.md",
    "/docs/%",
    "/docs/%25",
    "/docs/%2F",
    "/docs/%E0%A4%A",
    "/fr/docs",
  ]) {
    const response = await get(path);
    assert.equal(response.status, 404, path);
    await response.body?.cancel();
  }
  assert.equal((await get("/api/docs-markdown")).status, 400);
  assert.equal(
    (await get("/api/docs-markdown?path=/docs/../package")).status,
    400,
  );
});

test("indexes expose canonical docs and environment-aware robots", async () => {
  const xml = await (await get("/sitemap.xml")).text();
  assert.equal([...xml.matchAll(/<loc>/g)].length, pages.length + 3);
  const llms = await (await get("/llms.txt")).text();
  const markdown = await (await get("/sitemap.md")).text();
  for (const page of pages) {
    assert.ok(xml.includes(`${origin}${page.path}</loc>`));
    assert.ok(llms.includes(`${origin}${page.path}.md`));
    assert.ok(markdown.includes(`](${page.path})`));
  }
  const robots = await (await get("/robots.txt")).text();
  assert.ok(robots.includes(noindex ? "Disallow: /" : "Allow: /"));
  assert.ok(robots.includes(`${origin}/sitemap.xml`));
});

test("native and legacy search remain usable", async () => {
  const native = await (
    await get("/api/search?query=StateProvider&locale=en")
  ).json();
  assert.ok(
    Array.isArray(native) &&
      native.some((item) => item.url.startsWith("/docs/")),
  );
  const legacy = await (await get("/api/search?q=catalog")).json();
  assert.ok(legacy.results.some((item) => item.href === "/docs/catalog"));
  assert.deepEqual(
    await (
      await get("/api/search?query=zzzz-no-document-12345&locale=en")
    ).json(),
    [],
  );
});

test("static assets and HEAD bypass representation mistakes", async () => {
  for (const path of ["/og", "/og/docs/api/core", "/favicon.ico"]) {
    const response = await get(path, { headers: { accept: "text/markdown" } });
    assert.equal(response.status, 200);
    assert.match(contentType(response), /^image\//);
    await response.body?.cancel();
  }
  for (const accept of ["text/html", "text/markdown"]) {
    const response = await get("/docs", {
      method: "HEAD",
      headers: { accept },
    });
    assert.equal(response.status, 200);
    assert.equal(contentType(response), accept);
    assert.equal(await response.text(), "");
    negotiationHeaders(response, accept === "text/html");
  }
});
