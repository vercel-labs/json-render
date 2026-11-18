import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { JsonPatch, Spec } from "@json-render/core";
import { useChatUI } from "./hooks";
import { JSONUIProvider, Renderer, type ComponentRegistry } from "./renderer";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const registry: ComponentRegistry = {
  List: ({ children }) => <ul>{children}</ul>,
  Item: ({ element }) => <li>{String(element.props.label)}</li>,
};

describe("useChatUI streamed state", () => {
  it("renders appended, edited, and removed repeat items before the stream ends", async () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({
      start(value) {
        controller = value;
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(stream)),
    );

    let chat!: ReturnType<typeof useChatUI>;
    const onComplete = vi.fn();
    function App() {
      chat = useChatUI({ api: "/api/chat", onComplete });
      const spec = chat.messages.at(-1)?.spec;
      return (
        <JSONUIProvider registry={registry} initialState={spec?.state}>
          <Renderer
            spec={spec ?? null}
            registry={registry}
            loading={chat.isStreaming}
          />
        </JSONUIProvider>
      );
    }
    render(<App />);

    let request!: Promise<void>;
    await act(async () => {
      request = chat.send("Show the items");
    });

    async function push(...patches: JsonPatch[]) {
      await act(async () => {
        controller.enqueue(
          new TextEncoder().encode(
            patches.map((patch) => JSON.stringify(patch)).join("\n") + "\n",
          ),
        );
      });
    }

    const labels = () =>
      screen.queryAllByRole("listitem").map((item) => item.textContent);
    const currentSpec = () => chat.messages.at(-1)!.spec as Spec;

    try {
      await push(
        { op: "add", path: "/root", value: "list" },
        {
          op: "add",
          path: "/elements/list",
          value: {
            type: "List",
            props: {},
            repeat: { statePath: "/items", key: "id" },
            children: ["item"],
          },
        },
        {
          op: "add",
          path: "/elements/item",
          value: { type: "Item", props: { label: { $item: "label" } } },
        },
        { op: "add", path: "/state", value: { items: [] } },
      );
      const empty = currentSpec();
      expect(labels()).toEqual([]);

      await push({
        op: "add",
        path: "/state/items/0",
        value: { id: "a", label: "First" },
      });
      await waitFor(() => expect(labels()).toEqual(["First"]));
      const first = currentSpec();
      expect(empty.state?.items).toEqual([]);
      expect(chat.isStreaming).toBe(true);

      await push({
        op: "add",
        path: "/state/items/-",
        value: { id: "b", label: "Second" },
      });
      await waitFor(() => expect(labels()).toEqual(["First", "Second"]));

      await push({
        op: "replace",
        path: "/state/items/0/label",
        value: "Updated",
      });
      await waitFor(() => expect(labels()).toEqual(["Updated", "Second"]));

      await push({ op: "remove", path: "/state/items/1" });
      await waitFor(() => expect(labels()).toEqual(["Updated"]));
      expect(first.state?.items).toEqual([{ id: "a", label: "First" }]);
      expect(chat.isStreaming).toBe(true);
      expect(onComplete).not.toHaveBeenCalled();
    } finally {
      await act(async () => {
        controller.close();
        await request;
      });
    }

    expect(chat.error).toBeNull();
    expect(chat.isStreaming).toBe(false);
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete.mock.calls[0]![0].spec).toEqual(currentSpec());
  });
});
