"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Upload } from "lucide-react";
import { useEditorStore } from "@/lib/store";
import { useIsMobile } from "@/lib/use-mobile";

export function DropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createCustomObject = useEditorStore((s) => s.createCustomObject);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const isMobile = useIsMobile();

  const hasGlbFiles = useCallback((e: DragEvent) => {
    if (e.dataTransfer?.types.includes("Files")) return true;
    return false;
  }, []);

  const processFiles = useCallback(
    async (files: File[]) => {
      const glbFiles = files.filter(
        (f) =>
          f.name.endsWith(".glb") ||
          f.name.endsWith(".gltf") ||
          f.type === "model/gltf-binary" ||
          f.type === "model/gltf+json",
      );

      if (glbFiles.length === 0) return;

      setIsUploading(true);

      for (const file of glbFiles) {
        try {
          let modelUrl: string;

          try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("filename", file.name);

            const res = await fetch("/api/upload-model", {
              method: "POST",
              body: formData,
            });

            if (res.ok) {
              const data = await res.json();
              modelUrl = data.url;
            } else {
              modelUrl = URL.createObjectURL(file);
            }
          } catch {
            modelUrl = URL.createObjectURL(file);
          }

          const name = file.name.replace(/\.(glb|gltf)$/i, "");
          createCustomObject("model", {
            name: name.charAt(0).toUpperCase() + name.slice(1),
            modelUrl,
            position: [0, 0, 0],
            scale: [1, 1, 1],
          });
        } catch (err) {
          console.error("Failed to add model:", err);
        }
      }

      setIsUploading(false);
    },
    [createCustomObject],
  );

  useEffect(() => {
    if (isPlaying) return;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current++;
      if (hasGlbFiles(e)) {
        setIsDragging(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDragging(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);

      if (!e.dataTransfer) return;
      await processFiles(Array.from(e.dataTransfer.files));
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [isPlaying, hasGlbFiles, processFiles]);

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files) {
      await processFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (isPlaying) return null;

  return (
    <>
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500/50 rounded-lg flex items-center justify-center z-[6] pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-6 py-4 flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-blue-400" />
            <span className="text-sm text-blue-300 font-medium">
              Drop .glb file to add model
            </span>
          </div>
        </div>
      )}
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[6]">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-6 py-4">
            <span className="text-sm text-white">Adding model...</span>
          </div>
        </div>
      )}
      {isMobile && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-4 left-[4.5rem] z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 active:bg-white/30 text-white transition-colors backdrop-blur-sm"
            title="Import .glb model"
          >
            <Upload size={18} />
          </button>
        </>
      )}
    </>
  );
}
