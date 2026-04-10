"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import * as SPLAT from "gsplat";

type Vec3 = [number, number, number];

interface SplatEntry {
  src: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  visible?: boolean;
}

interface ViewerProps {
  width?: string;
  height?: string;
  backgroundColor?: string;
  controls?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  cameraPosition?: Vec3 | null;
  cameraTarget?: Vec3 | null;
  fov?: number | null;
  progressBarColor?: string;
  progressTrackColor?: string;
  progressTextColor?: string;
  progressBackgroundColor?: string;
  /** Custom loading indicator — overrides the default progress bar */
  loadingIndicator?: ReactNode;
  /** Splat file URLs to load */
  splats?: SplatEntry[];
  children?: ReactNode;
}

interface ProgressIndicatorProps {
  progress: number;
  backgroundColor?: string;
  textColor?: string;
  barColor?: string;
  trackColor?: string;
}

function ProgressIndicator({
  progress,
  backgroundColor = "#0a0a0a",
  textColor = "#666",
  barColor = "#fff",
  trackColor = "#1e1e1e",
}: ProgressIndicatorProps) {
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
        background: backgroundColor,
        gap: 12,
      }}
    >
      <span
        aria-live="polite"
        style={{
          color: textColor,
          fontFamily: "ui-monospace, monospace",
          fontSize: 13,
          letterSpacing: "0.04em",
        }}
      >
        Loading splat... {pct}%
      </span>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Loading progress"
        style={{
          width: 200,
          height: 2,
          background: trackColor,
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: barColor,
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

/** Convert euler angles (degrees, XYZ order) to a Quaternion. */
function eulerToQuaternion(euler: Vec3): SPLAT.Quaternion {
  const [ex, ey, ez] = euler.map((d) => (d * Math.PI) / 180) as [
    number,
    number,
    number,
  ];
  const cx = Math.cos(ex / 2),
    sx = Math.sin(ex / 2);
  const cy = Math.cos(ey / 2),
    sy = Math.sin(ey / 2);
  const cz = Math.cos(ez / 2),
    sz = Math.sin(ez / 2);
  return new SPLAT.Quaternion(
    sx * cy * cz + cx * sy * sz,
    cx * sy * cz - sx * cy * sz,
    cx * cy * sz + sx * sy * cz,
    cx * cy * cz - sx * sy * sz,
  );
}

/**
 * Container that manages a WebGL canvas and loads gaussian splats
 * using Hugging Face's gsplat.js — a standalone WebGL renderer (no Three.js).
 *
 * This is an experimental demo component, kept inline in the example app.
 */
export function GaussianSplatViewer({
  width = "100%",
  height = "100%",
  backgroundColor = "#000000",
  controls: enableControls = true,
  autoRotate = false,
  autoRotateSpeed = 1,
  cameraPosition = null,
  cameraTarget = null,
  fov = null,
  progressBarColor,
  progressTrackColor,
  progressTextColor,
  progressBackgroundColor,
  children,
  loadingIndicator,
  splats,
}: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

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

        // Handle resize (debounced to avoid layout thrashing)
        let resizeTimer: ReturnType<typeof setTimeout>;
        const onResize = () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            const r = container.getBoundingClientRect();
            renderer.setSize(r.width, r.height);
            // Update focal length on resize to maintain FOV
            if (fov) {
              const fl = fovToFocalLength(fov, r.height);
              camera.data.fx = fl;
              camera.data.fy = fl;
            }
          }, 100);
        };
        window.addEventListener("resize", onResize);

        // Load splat files with progress tracking
        if (splats && splats.length > 0) {
          const totalSplats = splats.length;
          for (let i = 0; i < totalSplats; i++) {
            if (cancelled) return;
            const entry = splats[i]!;
            const splatObject = await SPLAT.Loader.LoadAsync(
              entry.src,
              scene,
              (p: number) => {
                if (!cancelled) {
                  const overallProgress = (i + p) / totalSplats;
                  // Use Math.max to prevent progress bar from jumping backwards
                  setProgress((prev) => Math.max(prev, overallProgress));
                }
              },
            );

            // Apply per-splat transforms
            if (entry.position) {
              splatObject.position = new SPLAT.Vector3(
                entry.position[0],
                entry.position[1],
                entry.position[2],
              );
            }
            if (entry.rotation) {
              splatObject.rotation = eulerToQuaternion(entry.rotation);
            }
            if (entry.scale) {
              splatObject.scale = new SPLAT.Vector3(
                entry.scale[0],
                entry.scale[1],
                entry.scale[2],
              );
            }
            if (entry.visible !== undefined) {
              splatObject.visible = entry.visible;
            }
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
            // Rotate the camera around the camera target (not world origin)
            const speed = autoRotateSpeed * 0.5;
            const angle = speed * dt;
            const pos = camera.position;
            const target = cameraTarget
              ? new SPLAT.Vector3(
                  cameraTarget[0],
                  cameraTarget[1],
                  cameraTarget[2],
                )
              : new SPLAT.Vector3(0, 0, 0);
            const dx = pos.x - target.x;
            const dz = pos.z - target.z;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            camera.position = new SPLAT.Vector3(
              target.x + dx * cos - dz * sin,
              pos.y,
              target.z + dx * sin + dz * cos,
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
          clearTimeout(resizeTimer);
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
        (loadingIndicator ?? (
          <ProgressIndicator
            progress={progress}
            backgroundColor={progressBackgroundColor}
            barColor={progressBarColor}
            trackColor={progressTrackColor}
            textColor={progressTextColor}
          />
        ))}
      {error && (
        <div
          role="alert"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: backgroundColor,
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
