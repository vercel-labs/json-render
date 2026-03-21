import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "game-engine/models/" });
    const models = blobs.map((blob) => ({
      name: blob.pathname.split("/").pop() || "Unknown",
      url: blob.url,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
    }));
    return NextResponse.json({ models });
  } catch (error) {
    console.error("Failed to list models:", error);
    return NextResponse.json(
      { error: "Failed to list models" },
      { status: 500 },
    );
  }
}
