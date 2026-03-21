import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const filenameFromForm = formData.get("filename");
    const filename = filenameFromForm ? String(filenameFromForm) : file.name;
    const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9.]/g, "-");

    const blob = await put(`game-engine/models/${cleanFilename}`, file, {
      access: "public",
    });

    return NextResponse.json({ url: blob.url, name: cleanFilename });
  } catch (error) {
    console.error("Failed to upload model:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }
}
