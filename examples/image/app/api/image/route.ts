import { renderToPng } from "@json-render/image/render";
import { examples } from "@/lib/examples";
import type { Spec } from "@json-render/core";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

let fontCache: ArrayBuffer | null = null;

async function loadFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;
  const fontPath = join(
    process.cwd(),
    "node_modules",
    "geist",
    "dist",
    "fonts",
    "geist-sans",
    "Geist-Regular.ttf",
  );
  const buffer = await readFile(fontPath);
  fontCache = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
  return fontCache;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "og-image";
  const download = searchParams.get("download") === "1";

  const example = examples.find((e) => e.name === name);
  if (!example) {
    return new Response("Example not found", { status: 404 });
  }

  return imageResponse(example.spec, name, download);
}

export async function POST(req: Request) {
  const { spec, download, filename } = (await req.json()) as {
    spec: Spec;
    download?: boolean;
    filename?: string;
  };

  if (!spec || !spec.root || !spec.elements) {
    return new Response("Invalid spec", { status: 400 });
  }

  return imageResponse(spec, filename ?? "image", download ?? false);
}

async function imageResponse(spec: Spec, name: string, download: boolean) {
  const fontData = await loadFont();
  const fonts = [
    {
      name: "Geist Sans",
      data: fontData,
      weight: 400 as const,
      style: "normal" as const,
    },
  ];

  const png = await renderToPng(spec, { fonts });

  const disposition = download
    ? `attachment; filename="${name}.png"`
    : `inline; filename="${name}.png"`;

  return new Response(Buffer.from(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": disposition,
      "Cache-Control": "no-store",
    },
  });
}
