import { describe, expect, it } from "vitest";
import type { PropResolutionContext, UIElement } from "@json-render/core";

import { collectElementStatePaths } from "./collect-element-state-paths";

const baseCtx: PropResolutionContext = {
  stateModel: {},
  functions: {},
  directives: new Map(),
};

const repeatCtx: PropResolutionContext = {
  ...baseCtx,
  repeatBasePath: "/todos/0",
};

function el(partial: Partial<UIElement>): UIElement {
  return { type: "X", props: {}, ...partial } as UIElement;
}

describe("collectElementStatePaths", () => {
  it("collects $state prop dependencies", () => {
    const paths = collectElementStatePaths(
      el({ props: { value: { $state: "/count" } } }),
      baseCtx,
    );
    expect(paths.has("/count")).toBe(true);
  });

  it("collects $item paths resolved against repeatBasePath", () => {
    const paths = collectElementStatePaths(
      el({ props: { value: { $item: "title" } } }),
      repeatCtx,
    );
    expect(paths.has("/todos/0/title")).toBe(true);
  });

  it("collects visibility $state dependencies", () => {
    const paths = collectElementStatePaths(
      el({ visible: { $state: "/tab", eq: "home" } }),
      baseCtx,
    );
    expect(paths.has("/tab")).toBe(true);
  });

  it("collects action param and repeat.statePath dependencies", () => {
    const paths = collectElementStatePaths(
      el({
        on: {
          press: { action: "setState", params: { value: { $state: "/x" } } },
        },
        repeat: { statePath: "/items" },
      }),
      baseCtx,
    );
    expect(paths.has("/x")).toBe(true);
    expect(paths.has("/items")).toBe(true);
  });

  it("collects both candidates for bare $template tokens in a repeat", () => {
    const paths = collectElementStatePaths(
      el({ props: { label: { $template: "Hi ${name}" } } }),
      repeatCtx,
    );
    expect(paths.has("/name")).toBe(true);
    expect(paths.has("/todos/0/name")).toBe(true);
  });
});
