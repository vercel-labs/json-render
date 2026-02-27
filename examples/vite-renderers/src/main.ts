import "./shared/styles.css";
import { demoSpec } from "./spec";

type Renderer = "vue" | "react";

const container = document.getElementById("renderer-root") as HTMLElement;

let unmountCurrent: (() => void) | null = null;

async function switchTo(renderer: Renderer) {
  unmountCurrent?.();
  container.innerHTML = "";
  if (renderer === "vue") {
    const mod = await import("./vue/mount.ts");
    mod.mount(container, renderer, demoSpec);
    unmountCurrent = mod.unmount;
  } else {
    const mod = await import("./react/mount.tsx");
    mod.mount(container, renderer, demoSpec);
    unmountCurrent = mod.unmount;
  }
}

// The RendererTabs component (rendered by JSON renderer) dispatches this event
document.addEventListener("switch-renderer", (e: Event) => {
  switchTo((e as CustomEvent<string>).detail as Renderer);
});

// Default: Vue
switchTo("vue");
