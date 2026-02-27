import { createApp, type App } from "vue";
import type { Spec } from "@json-render/core";
import VueApp from "./App.vue";

let app: App | null = null;

export function mount(container: HTMLElement, renderer: string, spec: Spec) {
  app = createApp(VueApp, { initialRenderer: renderer, spec });
  app.mount(container);
}

export function unmount() {
  app?.unmount();
  app = null;
}
