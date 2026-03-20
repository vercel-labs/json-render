import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FONTS_DIR = join(ROOT, "apps/web/public");

const WIDTH = 1200;
const HEIGHT = 630;

type Framework = "nextjs" | "vite" | "sveltekit";

interface Example {
  dir: string;
  title: string;
  framework: Framework;
}

const EXAMPLES: Example[] = [
  { dir: "chat", title: "Chat Example", framework: "nextjs" },
  { dir: "dashboard", title: "Dashboard Example", framework: "nextjs" },
  { dir: "image", title: "Image Example", framework: "nextjs" },
  { dir: "no-ai", title: "No AI Example", framework: "nextjs" },
  { dir: "react-email", title: "React Email Example", framework: "nextjs" },
  { dir: "react-pdf", title: "React PDF Example", framework: "nextjs" },
  { dir: "react-three-fiber", title: "React Three Fiber Example", framework: "nextjs" },
  { dir: "remotion", title: "Remotion Example", framework: "nextjs" },
  { dir: "solid", title: "Solid Example", framework: "vite" },
  { dir: "svelte", title: "Svelte Example", framework: "vite" },
  { dir: "svelte-chat", title: "Svelte Chat Example", framework: "sveltekit" },
  { dir: "vue", title: "Vue Example", framework: "vite" },
  { dir: "vite-renderers", title: "Multi-Renderer Example", framework: "vite" },
];

function getOutputPath(example: Example): string {
  const base = join(ROOT, "examples", example.dir);
  switch (example.framework) {
    case "nextjs":
      return join(base, "app", "opengraph-image.png");
    case "vite":
      return join(base, "public", "og-image.png");
    case "sveltekit":
      return join(base, "static", "og-image.png");
  }
}

function buildMarkup(title: string) {
  return {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "black",
        padding: "60px 80px",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "16px",
            },
            children: [
              {
                type: "svg",
                props: {
                  width: 36,
                  height: 36,
                  viewBox: "0 0 16 16",
                  fill: "white",
                  children: {
                    type: "path",
                    props: {
                      fillRule: "evenodd",
                      clipRule: "evenodd",
                      d: "M8 1L16 15H0L8 1Z",
                    },
                  },
                },
              },
              {
                type: "span",
                props: {
                  style: {
                    fontSize: 36,
                    color: "#666",
                    fontFamily: "Geist",
                    fontWeight: 400,
                  },
                  children: "/",
                },
              },
              {
                type: "span",
                props: {
                  style: {
                    fontSize: 36,
                    fontFamily: "Geist Pixel Square",
                    fontWeight: 500,
                    color: "white",
                  },
                  children: "json-render",
                },
              },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flex: 1,
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            },
            children: title.split("\n").map((line: string) => ({
              type: "span",
              props: {
                style: {
                  fontSize: 72,
                  fontFamily: "Geist",
                  fontWeight: 400,
                  color: "white",
                  letterSpacing: "-0.02em",
                  textAlign: "center",
                  lineHeight: 1.2,
                },
                children: line,
              },
            })),
          },
        },
      ],
    },
  };
}

async function main() {
  const [geistRegular, geistPixelSquare] = await Promise.all([
    readFile(join(FONTS_DIR, "Geist-Regular.ttf")),
    readFile(join(FONTS_DIR, "GeistPixel-Square.ttf")),
  ]);

  const fonts = [
    { name: "Geist", data: geistRegular, weight: 400 as const, style: "normal" as const },
    { name: "Geist Pixel Square", data: geistPixelSquare, weight: 500 as const, style: "normal" as const },
  ];

  for (const example of EXAMPLES) {
    const svg = await satori(buildMarkup(example.title), {
      width: WIDTH,
      height: HEIGHT,
      fonts,
    });

    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: WIDTH },
    });
    const png = resvg.render().asPng();

    const outPath = getOutputPath(example);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, png);

    console.log(`  ${example.dir} -> ${outPath.replace(ROOT + "/", "")}`);
  }

  console.log(`\nGenerated ${EXAMPLES.length} OG images.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
