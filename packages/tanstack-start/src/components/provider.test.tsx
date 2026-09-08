import React from "react";
import {
  Outlet,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Spec } from "@json-render/core";
import type { ComponentRenderProps } from "@json-render/react";
import { createStartApp } from "../create-app";
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

function Button({ emit }: ComponentRenderProps) {
  return <button onClick={() => emit("press")}>Change</button>;
}

function LabeledText({
  element,
}: ComponentRenderProps<{ label: string; value: unknown }>) {
  return <span>{`${element.props.label}:${String(element.props.value)}`}</span>;
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

  it("resets page state when the catch-all route changes", async () => {
    let resolveNextPage!: () => void;
    const nextPage = new Promise<void>((resolve) => {
      resolveNextPage = resolve;
    });
    let markNextPageStarted!: () => void;
    const nextPageStarted = new Promise<void>((resolve) => {
      markNextPageStarted = resolve;
    });
    const spec: StartAppSpec = {
      routes: {
        "/a": {
          page: {
            root: "container",
            state: { count: 0 },
            elements: {
              container: {
                type: "Container",
                props: {},
                children: ["text", "button"],
              },
              text: {
                type: "LabeledText",
                props: { label: "A", value: { $state: "/count" } },
                children: [],
              },
              button: {
                type: "Button",
                props: {},
                on: {
                  press: {
                    action: "setState",
                    params: { statePath: "/count", value: 5 },
                  },
                },
                children: [],
              },
            },
          },
        },
        "/b": {
          page: {
            root: "text",
            state: { count: 0 },
            elements: {
              text: {
                type: "LabeledText",
                props: { label: "B", value: { $state: "/count" } },
                children: [],
              },
            },
          },
        },
      },
    };
    const app = createStartApp({ spec });
    const rootRoute = createRootRoute({
      component: () => (
        <StartAppProvider registry={{ Button, Container, LabeledText }}>
          <Outlet />
        </StartAppProvider>
      ),
    });
    const route = createRoute({
      getParentRoute: () => rootRoute,
      path: "$",
      loader: async ({ location }) => {
        if (location.pathname === "/b") {
          markNextPageStarted();
          await nextPage;
        }
        return app.getPageData({ pathname: location.pathname });
      },
      component: Page,
    });

    function Page() {
      const data = route.useLoaderData();
      return data ? <PageRenderer {...data} /> : null;
    }

    const router = createRouter({
      routeTree: rootRoute.addChildren([route]),
      history: createMemoryHistory({ initialEntries: ["/a"] }),
    });
    await router.load();
    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    expect(screen.getByText("A:5")).toBeTruthy();

    let navigation!: Promise<void>;
    await act(async () => {
      navigation = router.navigate({ to: "/b" });
      await nextPageStarted;
    });

    const pendingPageValue = screen.getByText(/^A:/).textContent;

    await act(async () => {
      resolveNextPage();
      await navigation;
    });
    expect(pendingPageValue).toBe("A:5");
    expect(screen.getByText("B:0")).toBeTruthy();
  });
});
