import assert from "node:assert/strict";
import process from "node:process";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("../", import.meta.url));
const socket = createServer();
await new Promise((resolve, reject) => {
  socket.once("error", reject);
  socket.listen(0, "127.0.0.1", resolve);
});
const port = socket.address().port;
await new Promise((resolve, reject) =>
  socket.close((error) => (error ? reject(error) : resolve())),
);

function launch(args, env) {
  const child = spawn(process.execPath, args, { cwd, stdio: "inherit", env });
  const result = { child, done: false, exited: undefined };
  result.exited = new Promise((resolve) => {
    child.once("error", (error) => {
      console.error(error.message);
      result.done = true;
      resolve(1);
    });
    child.once("exit", (code) => {
      result.done = true;
      resolve(code ?? 1);
    });
  });
  return result;
}

const server = launch(
  [
    fileURLToPath(import.meta.resolve("next/dist/bin/next")),
    "start",
    "--hostname",
    "127.0.0.1",
  ],
  { ...process.env, NODE_ENV: "production", PORT: String(port) },
);
const url = `http://127.0.0.1:${port}`;
let tests;
let shutdown;
let stopping = false;
const stop = () => {
  stopping = true;
  shutdown ??= Promise.all(
    [tests, server].map(async (owned) => {
      if (!owned || owned.done) return;
      owned.child.kill("SIGTERM");
      const deadline = setTimeout(() => owned.child.kill("SIGKILL"), 5000);
      try {
        await owned.exited;
      } finally {
        clearTimeout(deadline);
      }
    }),
  );
  return shutdown;
};
for (const [signal, code] of [
  ["SIGINT", 130],
  ["SIGTERM", 143],
]) {
  process.once(signal, () => {
    void stop().finally(() => process.exit(code));
  });
}

try {
  const deadline = Date.now() + 60000;
  let ready = false;
  while (Date.now() < deadline && !stopping) {
    if (server.done)
      throw new Error(`Docs server exited with ${await server.exited}`);
    try {
      const response = await fetch(`${url}/robots.txt`, {
        signal: AbortSignal.timeout(1000),
      });
      await response.body?.cancel();
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      ready = false;
    }
    await sleep(100);
  }
  if (!ready && !stopping)
    throw new Error(
      "Docs server did not become ready. Run the docs build first.",
    );
  if (!stopping) {
    const bridge = await fetch(`${url}/api/mcp?webmcp-script`, {
      signal: AbortSignal.timeout(30000),
    });
    assert.equal(bridge.status, 200);
    assert.match(bridge.headers.get("content-type") ?? "", /javascript/);
    assert.match(await bridge.text(), /registerTool/);
    console.log("PASS native WebMCP bridge returns JavaScript (200)");

    const rpc = async (method, params = {}) => {
      const response = await fetch(`${url}/api/mcp`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(30000),
      });
      assert.equal(response.status, 200);
      const type = response.headers.get("content-type")?.split(";")[0];
      assert.ok(["application/json", "text/event-stream"].includes(type));
      const body = await response.text();
      const messages =
        type === "application/json"
          ? [JSON.parse(body)]
          : body
              .split(/\r?\n\r?\n/)
              .map((event) =>
                event
                  .split(/\r?\n/)
                  .filter((line) => line.startsWith("data:"))
                  .map((line) => line.slice(5).replace(/^ /, ""))
                  .join("\n"),
              )
              .filter(Boolean)
              .map((data) => JSON.parse(data));
      const replies = messages.filter((message) => message.id === 1);
      assert.equal(replies.length, 1);
      const [message] = replies;
      assert.equal(message.jsonrpc, "2.0");
      assert.equal(message.error, undefined);
      return message.result;
    };
    const { tools } = await rpc("tools/list");
    assert.deepEqual(
      tools.map((tool) => tool.name),
      ["search_docs"],
    );
    console.log("PASS MCP tools/list exposes search_docs");

    const result = await rpc("tools/call", {
      name: "search_docs",
      arguments: { query: "StateProvider", locale: "en" },
    });
    assert.notEqual(result.isError, true);
    const matches = JSON.parse(
      result.content.find((item) => item.type === "text").text,
    );
    assert.ok(matches.some((item) => item.url.startsWith("/docs/")));
    console.log("PASS MCP tools/call returns actual docs search results");

    tests = launch(["--test", "tests/docs-routes.test.mjs"], {
      ...process.env,
      DOCS_TEST_URL: url,
    });
    process.exitCode = await tests.exited;
  }
} finally {
  await stop();
}
