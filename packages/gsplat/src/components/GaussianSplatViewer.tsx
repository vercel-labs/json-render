import React, { useEffect, useRef, useState, type ReactNode } from "react";
import * as SPLAT from "gsplat";
import type { GsplatProps } from "../catalog";

type Vec3 = [number, number, number];

interface ViewerProps {
  props: GsplatProps<"GaussianSplatViewer">;
  children?: ReactNode;
  /** Custom loading indicator — overrides the default progress bar */
  loadingIndicator?: ReactNode;
  /** Splat file URLs to load */
  splats?: Array<{
    src: string;
    position?: Vec3;
    rotation?: Vec3;
    scale?: Vec3;
  }>;
}

function ProgressIndicator({ progress }: { progress: number }) {
  const pct = Math.round(progress * 100);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        gap: 12,
      }}
    >
      <span
        style={{
          color: "#666",
          fontFamily: "ui-monospace, monospace",
          fontSize: 13,
          letterSpacing: "0.04em",
        }}
      >
        Loading splat... {pct}%
      </span>
      <div
        style={{
          width: 200,
          height: 2,
          background: "#1e1e1e",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "#fff",
            borderRadius: 1,
            transition: "width 150ms ease-out",
          }}
        />
      </div>
    </div>
  );
}

/**
 * Container that manages a WebGL canvas and loads gaussian splats
 * using Hugging Face's gsplat.js — a standalone WebGL renderer (no Three.js).
 */
export function GaussianSplatViewerComponent({
  props,
  children,
  loadingIndicator,
  splats,
}: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const width = props.width ?? "100%";
  const height = props.height ?? "100%";
  const backgroundColor = props.backgroundColor ?? "#000000";

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let cancelled = false;

    async function init() {
      try {
        // Clean up previous viewer
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }

        const scene = new SPLAT.Scene();
        const camera = new SPLAT.Camera();
        const renderer = new SPLAT.WebGLRenderer();
        const controls = new SPLAT.OrbitControls(camera, renderer.canvas);

        // Size the canvas to the container
        const rect = container.getBoundingClientRect();
        renderer.setSize(rect.width, rect.height);

        // Style and append the canvas — absolute positioning prevents overflow
        renderer.canvas.style.position = "absolute";
        renderer.canvas.style.top = "0";
        renderer.canvas.style.left = "0";
        renderer.canvas.style.width = "100%";
        renderer.canvas.style.height = "100%";
        renderer.canvas.style.display = "block";
        container.appendChild(renderer.canvas);

        // Handle resize
        const onResize = () => {
          const r = container.getBoundingClientRect();
          renderer.setSize(r.width, r.height);
        };
        window.addEventListener("resize", onResize);

        // Load splat files with progress tracking
        if (splats && splats.length > 0) {
          const totalSplats = splats.length;
          for (let i = 0; i < totalSplats; i++) {
            if (cancelled) return;
            const splat = splats[i]!;
            await SPLAT.Loader.LoadAsync(splat.src, scene, (p: number) => {
              if (!cancelled) {
                // Progress across all splats: completed splats + current splat progress
                const overallProgress = (i + p) / totalSplats;
                setProgress(overallProgress);
              }
            });
          }
        }

        if (cancelled) {
          controls.dispose();
          renderer.dispose();
          if (renderer.canvas.parentElement) {
            renderer.canvas.parentElement.removeChild(renderer.canvas);
          }
          window.removeEventListener("resize", onResize);
          return;
        }

        setIsLoading(false);
        setError(null);

        // Render loop
        let animationId: number;
        const frame = () => {
          controls.update();
          renderer.render(scene, camera);
          animationId = requestAnimationFrame(frame);
        };
        animationId = requestAnimationFrame(frame);

        // Store cleanup function
        cleanupRef.current = () => {
          cancelAnimationFrame(animationId);
          window.removeEventListener("resize", onResize);
          controls.dispose();
          renderer.dispose();
          if (renderer.canvas.parentElement) {
            renderer.canvas.parentElement.removeChild(renderer.canvas);
          }
        };
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to initialize viewer",
          );
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [splats]);

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        background: backgroundColor,
      }}
    >
      <div
        ref={containerRef}
        style={{ position: "relative", width: "100%", height: "100%" }}
      />
      {isLoading &&
        (loadingIndicator ?? <ProgressIndicator progress={progress} />)}
      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0a",
            color: "#ff4444",
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
            padding: 20,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}
      {children}
    </div>
  );
}
