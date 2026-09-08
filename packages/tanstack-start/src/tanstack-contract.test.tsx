import React from "react";
import { createRootRoute, createRoute, notFound } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import {
  PageRenderer,
  StartErrorBoundary,
  StartLoading,
  StartNotFound,
} from "./index";
import { createStartApp } from "./server";
import type { StartAppSpec } from "./types";

const spec: StartAppSpec = {
  routes: {
    "/$": {
      page: {
        root: "root",
        elements: {
          root: { type: "Card", props: {}, children: [] },
        },
      },
    },
  },
};

const app = createStartApp({ spec });
const rootRoute = createRootRoute();
const route = createRoute({
  getParentRoute: () => rootRoute,
  path: "$",
  loader: async ({ location }) => {
    const data = await app.getPageData({ pathname: location.pathname });
    if (!data) throw notFound();
    return data;
  },
  head: ({ match }) => app.getHead({ pathname: match.pathname }),
  component: RouteComponent,
  pendingComponent: StartLoading,
  errorComponent: StartErrorBoundary,
  notFoundComponent: StartNotFound,
});

function RouteComponent() {
  return <PageRenderer {...route.useLoaderData()} />;
}

describe("TanStack Router contract", () => {
  it("accepts all json-render route hooks and components", () => {
    expect(route.options.loader).toBeTypeOf("function");
    expect(route.options.head).toBeTypeOf("function");
  });
});
