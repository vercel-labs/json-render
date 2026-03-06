import { mount as mountComponent, unmount as unmountComponent } from "svelte";
import type { Spec } from "@json-render/core";
import App from "./App.svelte";

let app: ReturnType<typeof mountComponent> | null = null;

export function mount(container: HTMLElement, renderer: string, spec: Spec) {
  app = mountComponent(App, {
    target: container,
    props: { initialRenderer: renderer, spec },
  });
}

export function unmount() {
  if (app) {
    unmountComponent(app);
    app = null;
  }
}
