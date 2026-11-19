import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { onCleanup } from "solid-js";
import {
  createStateStore,
  markDevtoolsActive,
  type Spec,
} from "@json-render/core";
import {
  JSONUIProvider,
  Renderer,
  type ComponentRegistry,
  type ComponentRenderProps,
} from "./renderer";
import { useStateStore } from "./contexts/state";

const registry = {
  Text: (props: ComponentRenderProps<{ text: string }>) => (
    <p>{props.element.props.text}</p>
  ),
};

const spec: Spec = {
  root: "text",
  elements: {
    text: { type: "Text", props: { text: "Visible renderer" } },
  },
};

let releaseActive: (() => void) | undefined;

afterEach(() => {
  cleanup();
  releaseActive?.();
  releaseActive = undefined;
});

describe("Renderer devtools activation", () => {
  it("renders without a wrapper while devtools is inactive", () => {
    const { container } = render(() => (
      <JSONUIProvider registry={registry}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>
    ));

    expect(container.innerHTML).toBe("<p>Visible renderer</p>");
  });

  it("renders inside the picker wrapper when devtools is already active", () => {
    releaseActive = markDevtoolsActive();
    const { container } = render(() => (
      <JSONUIProvider registry={registry}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>
    ));

    const wrapper = container.querySelector<HTMLElement>(
      '[data-jr-key="text"]',
    );
    expect(wrapper?.style.display).toBe("contents");
    expect(wrapper?.querySelector("p")?.textContent).toBe("Visible renderer");
  });

  it("keeps content when devtools activates, deactivates and reactivates", () => {
    const { container } = render(() => (
      <JSONUIProvider registry={registry}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>
    ));

    for (let cycle = 0; cycle < 2; cycle++) {
      releaseActive = markDevtoolsActive();
      expect(
        container.querySelector('[data-jr-key="text"] > p')?.textContent,
      ).toBe("Visible renderer");

      releaseActive();
      expect(container.innerHTML).toBe("<p>Visible renderer</p>");
    }
  });

  it("keeps nested props, bindings and events working across activation changes", async () => {
    const store = createStateStore({ text: "Initial" });
    let mounts = 0;
    let cleanups = 0;
    const nestedRegistry: ComponentRegistry = {
      ...registry,
      Stack: (props) => <section>{props.children}</section>,
      Input: (props: ComponentRenderProps<{ value: string }>) => {
        const state = useStateStore();
        mounts++;
        onCleanup(() => cleanups++);
        return (
          <input
            aria-label="Text"
            value={props.element.props.value}
            onInput={(event) => {
              state.set(props.bindings!.value!, event.currentTarget.value);
              props.emit("change");
            }}
          />
        );
      },
    };
    const nestedSpec: Spec = {
      root: "stack",
      elements: {
        stack: { type: "Stack", props: {}, children: ["text", "input"] },
        text: { type: "Text", props: { text: { $state: "/text" } } },
        input: {
          type: "Input",
          props: { value: { $bindState: "/text" } },
          on: {
            change: {
              action: "setState",
              params: { statePath: "/changed", value: true },
            },
          },
        },
      },
    };
    const { container, getByLabelText, unmount } = render(() => (
      <JSONUIProvider registry={nestedRegistry} store={store}>
        <Renderer spec={nestedSpec} registry={nestedRegistry} />
      </JSONUIProvider>
    ));

    for (const active of [true, false, true]) {
      if (active) releaseActive = markDevtoolsActive();
      else releaseActive?.();

      expect(container.querySelectorAll("[data-jr-key]").length).toBe(
        active ? 3 : 0,
      );
      store.set("/text", "Updated");
      expect(container.querySelector("section p")?.textContent).toBe("Updated");
      expect((getByLabelText("Text") as HTMLInputElement).value).toBe(
        "Updated",
      );

      store.set("/changed", false);
      fireEvent.input(getByLabelText("Text"), { target: { value: "Edited" } });
      await waitFor(() => expect(store.get("/changed")).toBe(true));
      expect(store.get("/text")).toBe("Edited");
      expect(container.querySelector("section p")?.textContent).toBe("Edited");
      expect(mounts - cleanups).toBe(1);
    }

    unmount();
    expect(cleanups).toBe(mounts);
    releaseActive?.();
    releaseActive = markDevtoolsActive();
    expect(mounts).toBe(cleanups);
  });
});
