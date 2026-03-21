"use client";

import { Loader2 } from "lucide-react";
import { useEditorStore } from "@/lib/store";

export function LoadingSpinner() {
  const isLoading = useEditorStore((s) => s.isLoading);

  if (!isLoading) return null;

  return (
    <div className="absolute top-4 right-4 bg-black/60 rounded-full p-2 shadow-md z-10 backdrop-blur-sm">
      <Loader2 className="h-5 w-5 animate-spin text-white" />
    </div>
  );
}
