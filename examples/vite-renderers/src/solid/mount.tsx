import { render } from "solid-js/web";
import type { Spec } from "@json-render/core";
import { App } from "./App";

let dispose: (() => void) | null = null;

export function mount(container: HTMLElement, renderer: string, spec: Spec) {
  dispose = render(
    () => <App initialRenderer={renderer} spec={spec} />,
    container,
  );
}

export function unmount() {
  dispose?.();
  dispose = null;
}
