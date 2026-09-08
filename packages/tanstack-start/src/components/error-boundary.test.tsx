import React from "react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { StartErrorBoundary } from "./error-boundary";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeAll(() => {
  window.scrollTo = () => {};
});

describe("StartErrorBoundary", () => {
  it("reruns a failed loader when the user tries again", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    let attempts = 0;
    const rootRoute = createRootRoute({ component: Outlet });
    const route = createRoute({
      getParentRoute: () => rootRoute,
      path: "$",
      loader: () => {
        attempts++;
        if (attempts === 1) throw new Error("Temporary failure");
        return { message: "Loaded" };
      },
      component: Page,
      errorComponent: StartErrorBoundary,
    });

    function Page() {
      return <div>{route.useLoaderData().message}</div>;
    }

    const router = createRouter({
      routeTree: rootRoute.addChildren([route]),
      history: createMemoryHistory({ initialEntries: ["/retry"] }),
    });
    await router.load();
    render(<RouterProvider router={router} />);

    expect(attempts).toBe(1);
    expect(screen.getByText("Temporary failure")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(screen.getByText("Loaded")).toBeTruthy());
    expect(attempts).toBe(2);
  });
});
