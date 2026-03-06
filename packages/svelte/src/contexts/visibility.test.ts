import { describe, it, expect } from "vitest";
import { mount, unmount } from "svelte";
import StateProvider, { getStateContext } from "./StateProvider.svelte";
import VisibilityProvider, {
  getVisibilityContext,
} from "./VisibilityProvider.svelte";

function component(
  runTest: () => void,
  initialState: Record<string, unknown> = {},
) {
  return () => {
    const c = mount(
      ((_anchor: any) => {
        (StateProvider as any)(_anchor, {
          initialState,
          children: ((_inner: any) => {
            (VisibilityProvider as any)(_inner, {
              children: (() => {
                runTest();
              }) as any,
            });
          }) as any,
        });
      }) as any,
      { target: document.body },
    );
    unmount(c);
  };
}

describe("VisibilityProvider", () => {
  it(
    "provides isVisible function",
    component(() => {
      const visCtx = getVisibilityContext();

      expect(typeof visCtx.isVisible).toBe("function");
    }),
  );

  it(
    "provides visibility context",
    component(
      () => {
        const visCtx = getVisibilityContext();

        expect(visCtx.ctx).toBeDefined();
        expect(visCtx.ctx.stateModel).toEqual({ value: true });
      },
      { value: true },
    ),
  );
});

describe("isVisible", () => {
  it(
    "returns true for undefined condition",
    component(() => {
      const visCtx = getVisibilityContext();

      expect(visCtx.isVisible(undefined)).toBe(true);
    }),
  );

  it(
    "returns true for true condition",
    component(() => {
      const visCtx = getVisibilityContext();

      expect(visCtx.isVisible(true)).toBe(true);
    }),
  );

  it(
    "returns false for false condition",
    component(() => {
      const visCtx = getVisibilityContext();

      expect(visCtx.isVisible(false)).toBe(false);
    }),
  );

  it(
    "evaluates $state conditions against data",
    component(
      () => {
        const stateCtx = getStateContext();
        const visCtx = getVisibilityContext();

        expect(visCtx.isVisible({ $state: "/isLoggedIn" })).toBe(true);

        stateCtx.set("/isLoggedIn", false);

        expect(visCtx.isVisible({ $state: "/isLoggedIn" })).toBe(false);
      },
      { isLoggedIn: true },
    ),
  );

  it(
    "evaluates equality conditions",
    component(
      () => {
        const visCtx = getVisibilityContext();

        expect(visCtx.isVisible({ $state: "/tab", eq: "home" })).toBe(true);
        expect(visCtx.isVisible({ $state: "/tab", eq: "settings" })).toBe(
          false,
        );
      },
      { tab: "home" },
    ),
  );

  it(
    "evaluates array conditions (implicit AND)",
    component(
      () => {
        const visCtx = getVisibilityContext();

        expect(visCtx.isVisible([{ $state: "/a" }, { $state: "/b" }])).toBe(
          true,
        );

        expect(visCtx.isVisible([{ $state: "/a" }, { $state: "/c" }])).toBe(
          false,
        );
      },
      { a: true, b: true, c: false },
    ),
  );

  it(
    "evaluates $and conditions",
    component(
      () => {
        const visCtx = getVisibilityContext();

        expect(
          visCtx.isVisible({ $and: [{ $state: "/x" }, { $state: "/y" }] }),
        ).toBe(false);
      },
      { x: true, y: false },
    ),
  );

  it(
    "evaluates $or conditions",
    component(
      () => {
        const visCtx = getVisibilityContext();

        expect(
          visCtx.isVisible({ $or: [{ $state: "/x" }, { $state: "/y" }] }),
        ).toBe(true);
      },
      { x: true, y: false },
    ),
  );
});
