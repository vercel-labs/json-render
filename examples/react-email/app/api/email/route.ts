import {
  renderToHtml,
  renderToPlainText,
} from "@json-render/react-email/render";
import { examples } from "@/lib/examples";
import type { Spec } from "@json-render/core";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "vercel-invite";
  const plain = searchParams.get("plain") === "1";

  const example = examples.find((e) => e.name === name);
  if (!example) {
    return new Response("Example not found", { status: 404 });
  }

  return emailResponse(example.spec, plain);
}

export async function POST(req: Request) {
  const { spec, plain } = (await req.json()) as {
    spec: Spec;
    plain?: boolean;
  };

  if (!spec || !spec.root || !spec.elements) {
    return new Response("Invalid spec", { status: 400 });
  }

  return emailResponse(spec, plain ?? false);
}

async function emailResponse(spec: Spec, plain: boolean) {
  const content = plain
    ? await renderToPlainText(spec)
    : await renderToHtml(spec);

  return new Response(content, {
    headers: {
      "Content-Type": plain
        ? "text/plain; charset=utf-8"
        : "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
