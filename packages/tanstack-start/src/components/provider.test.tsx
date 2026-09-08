import React from "react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Spec } from "@json-render/core";
import type { ComponentRenderProps } from "@json-render/react";
import type { StartAppSpec } from "../types";
import { StartLoading } from "./loading-renderer";
import { PageRenderer } from "./page-renderer";
import { StartAppProvider } from "./provider";

afterEach(cleanup);
beforeAll(() => {
  window.scrollTo = () => {};
});

function Text({ element }: ComponentRenderProps<{ value: unknown }>) {
  return <span>{String(element.props.value)}</span>;
}

function Container({ children }: ComponentRenderProps) {
  return <div>{children}</div>;
}

async function renderInRouter(component: React.ReactNode) {
  const rootRoute = createRootRoute({ component: () => component });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
}

describe("StartAppProvider", () => {
  it("forwards named functions to $computed expressions", async () => {
    const page: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Text",
          props: {
            value: { $computed: "uppercase", args: { value: "hello" } },
          },
          children: [],
        },
      },
    };

    await renderInRouter(
      <StartAppProvider
        registry={{ Text }}
        functions={{ uppercase: ({ value }) => String(value).toUpperCase() }}
      >
        <PageRenderer spec={page} />
      </StartAppProvider>,
    );

    expect(screen.getByText("HELLO")).toBeTruthy();
  });

  it("renders the matched route's loading spec", async () => {
    const loading: Spec = {
      root: "root",
      state: { message: "Loading route" },
      elements: {
        root: {
          type: "Text",
          props: { value: { $state: "/message" } },
          children: [],
        },
      },
    };
    const spec: StartAppSpec = {
      state: { message: "Application" },
      routes: {
        "/": {
          page: loading,
          loading,
        },
      },
    };

    await renderInRouter(
      <StartAppProvider registry={{ Text }} spec={spec}>
        <StartLoading />
      </StartAppProvider>,
    );

    expect(screen.getByText("Loading route")).toBeTruthy();
  });

  it("uses layout state when page data is rendered directly", async () => {
    const page: Spec = {
      root: "page",
      elements: {
        page: { type: "Text", props: { value: "Page" }, children: [] },
      },
    };
    const layout: Spec = {
      root: "layout",
      state: { message: "Layout state" },
      elements: {
        layout: {
          type: "Container",
          props: {},
          children: ["message", "slot"],
        },
        message: {
          type: "Text",
          props: { value: { $state: "/message" } },
          children: [],
        },
        slot: { type: "Slot", props: {}, children: [] },
      },
    };

    await renderInRouter(
      <StartAppProvider registry={{ Container, Text }}>
        <PageRenderer spec={page} layoutSpec={layout} />
      </StartAppProvider>,
    );

    expect(screen.getByText("Layout state")).toBeTruthy();
    expect(screen.getByText("Page")).toBeTruthy();
  });
});
