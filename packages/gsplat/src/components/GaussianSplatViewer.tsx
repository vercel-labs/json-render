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

/** Convert a vertical FOV (degrees) to a focal length given a canvas height. */
function fovToFocalLength(fovDeg: number, height: number): number {
  return height / (2 * Math.tan((fovDeg * Math.PI) / 360));
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
  const enableControls = props.controls ?? true;
  const autoRotate = props.autoRotate ?? false;
  const autoRotateSpeed = props.autoRotateSpeed ?? 1;
  const cameraPosition = props.cameraPosition ?? null;
  const cameraTarget = props.cameraTarget ?? null;
  const fov = props.fov ?? null;

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

        // Apply camera position
        if (cameraPosition) {
          camera.position = new SPLAT.Vector3(
            cameraPosition[0],
            cameraPosition[1],
            cameraPosition[2],
          );
        }

        // Apply FOV by converting to focal length
        const rect = container.getBoundingClientRect();
        if (fov) {
          const fl = fovToFocalLength(fov, rect.height);
          camera.data.fx = fl;
          camera.data.fy = fl;
        }

        // Size the canvas to the container
        renderer.setSize(rect.width, rect.height);

        // Style and append the canvas — absolute positioning prevents overflow
        renderer.canvas.style.position = "absolute";
        renderer.canvas.style.top = "0";
        renderer.canvas.style.left = "0";
        renderer.canvas.style.width = "100%";
        renderer.canvas.style.height = "100%";
        renderer.canvas.style.display = "block";
        container.appendChild(renderer.canvas);

        // Only create orbit controls if enabled
        let controls: SPLAT.OrbitControls | null = null;
        if (enableControls) {
          controls = new SPLAT.OrbitControls(camera, renderer.canvas);

          // Apply camera target (look-at)
          if (cameraTarget) {
            controls.setCameraTarget(
              new SPLAT.Vector3(
                cameraTarget[0],
                cameraTarget[1],
                cameraTarget[2],
              ),
            );
          }
        }

        // Handle resize
        const onResize = () => {
          const r = container.getBoundingClientRect();
          renderer.setSize(r.width, r.height);
          // Update focal length on resize to maintain FOV
          if (fov) {
            const fl = fovToFocalLength(fov, r.height);
            camera.data.fx = fl;
            camera.data.fy = fl;
          }
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
                const overallProgress = (i + p) / totalSplats;
                setProgress(overallProgress);
              }
            });
          }
        }

        if (cancelled) {
          controls?.dispose();
          renderer.dispose();
          if (renderer.canvas.parentElement) {
            renderer.canvas.parentElement.removeChild(renderer.canvas);
          }
          window.removeEventListener("resize", onResize);
          return;
        }

        setIsLoading(false);
        setError(null);

        // Render loop with optional auto-rotation
        let animationId: number;
        let lastTime = performance.now();
        const frame = () => {
          const now = performance.now();
          const dt = (now - lastTime) / 1000;
          lastTime = now;

          if (autoRotate) {
            // Rotate the camera around the Y axis
            const speed = autoRotateSpeed * 0.5;
            const angle = speed * dt;
            const pos = camera.position;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            camera.position = new SPLAT.Vector3(
              pos.x * cos - pos.z * sin,
              pos.y,
              pos.x * sin + pos.z * cos,
            );
          }

          controls?.update();
          renderer.render(scene, camera);
          animationId = requestAnimationFrame(frame);
        };
        animationId = requestAnimationFrame(frame);

        // Store cleanup function
        cleanupRef.current = () => {
          cancelAnimationFrame(animationId);
          window.removeEventListener("resize", onResize);
          controls?.dispose();
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
  }, [
    splats,
    enableControls,
    autoRotate,
    autoRotateSpeed,
    cameraPosition,
    cameraTarget,
    fov,
  ]);

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
