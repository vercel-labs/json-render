import { createRoot, type Root } from "react-dom/client";
import type { Spec } from "@json-render/core";
import App from "./App";

let root: Root | null = null;

export function mount(container: HTMLElement, renderer: string, spec: Spec) {
  root = createRoot(container);
  root.render(<App initialRenderer={renderer} spec={spec} />);
}

export function unmount() {
  root?.unmount();
  root = null;
}
