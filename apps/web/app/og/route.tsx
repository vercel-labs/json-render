import { renderLabsOg } from "./labs-og";

export async function GET() {
  return renderLabsOg({
    product: "json-render",
    title: "The generative UI framework",
  });
}
