import { describe, it, expect, vi } from "vitest";
import { mount, unmount } from "svelte";
import StateProvider, { getStateContext } from "./StateProvider.svelte";
import ActionProvider, { getActionContext } from "./ActionProvider.svelte";
import ValidationProvider, {
  getValidationContext,
} from "./ValidationProvider.svelte";

function component(
  runTest: () => Promise<void>,
  options: {
    initialState?: Record<string, unknown>;
    handlers?: Record<
      string,
      (params: Record<string, unknown>) => Promise<unknown> | unknown
    >;
    withValidation?: boolean;
  } = {},
) {
  return async () => {
    let promise: Promise<void>;
    const c = mount(
      ((_anchor: any) => {
        (StateProvider as any)(_anchor, {
          initialState: options.initialState ?? {},
          children: ((_inner: any) => {
            if (options.withValidation) {
              (ValidationProvider as any)(_inner, {
                children: ((__inner: any) => {
                  (ActionProvider as any)(__inner, {
                    handlers: options.handlers ?? {},
                    children: (() => {
                      promise = runTest();
                    }) as any,
                  });
                }) as any,
              });
              return;
            }

            (ActionProvider as any)(_inner, {
              handlers: options.handlers ?? {},
              children: (() => {
                promise = runTest();
              }) as any,
            });
          }) as any,
        });
      }) as any,
      { target: document.body },
    );
    await promise!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    unmount(c);
  };
}

describe("createActionContext", () => {
  it(
    "executes built-in setState action",
    component(
      async () => {
        const stateCtx = getStateContext();
        const actionCtx = getActionContext();

        await actionCtx.execute({
          action: "setState",
          params: { statePath: "/count", value: 5 },
        });

        expect(stateCtx.state.count).toBe(5);
      },
      { initialState: { count: 0 } },
    ),
  );

  it(
    "executes built-in pushState action",
    component(
      async () => {
        const stateCtx = getStateContext();
        const actionCtx = getActionContext();

        await actionCtx.execute({
          action: "pushState",
          params: { statePath: "/items", value: "c" },
        });

        expect(stateCtx.state.items).toEqual(["a", "b", "c"]);
      },
      { initialState: { items: ["a", "b"] } },
    ),
  );

  it(
    "pushState creates array if missing",
    component(async () => {
      const stateCtx = getStateContext();
      const actionCtx = getActionContext();

      await actionCtx.execute({
        action: "pushState",
        params: { statePath: "/newList", value: "first" },
      });

      expect(stateCtx.get("/newList")).toEqual(["first"]);
    }),
  );

  it(
    "executes built-in removeState action",
    component(
      async () => {
        const stateCtx = getStateContext();
        const actionCtx = getActionContext();

        await actionCtx.execute({
          action: "removeState",
          params: { statePath: "/items", index: 1 },
        });

        expect(stateCtx.state.items).toEqual(["a", "c"]);
      },
      { initialState: { items: ["a", "b", "c"] } },
    ),
  );

  it(
    "executes push navigation action",
    component(
      async () => {
        const stateCtx = getStateContext();
        const actionCtx = getActionContext();

        await actionCtx.execute({
          action: "push",
          params: { screen: "settings" },
        });

        expect(stateCtx.get("/currentScreen")).toBe("settings");
        expect(stateCtx.get("/navStack")).toEqual(["home"]);
      },
      { initialState: { currentScreen: "home" } },
    ),
  );

  it(
    "executes pop navigation action",
    component(
      async () => {
        const stateCtx = getStateContext();
        const actionCtx = getActionContext();

        await actionCtx.execute({ action: "pop" });

        expect(stateCtx.get("/currentScreen")).toBe("home");
        expect(stateCtx.get("/navStack")).toEqual([]);
      },
      { initialState: { currentScreen: "settings", navStack: ["home"] } },
    ),
  );

  it(
    "executes custom handlers",
    (() => {
      const customHandler = vi.fn().mockResolvedValue(undefined);
      return component(
        async () => {
          const actionCtx = getActionContext();

          await actionCtx.execute({
            action: "myAction",
            params: { foo: "bar" },
          });

          expect(customHandler).toHaveBeenCalledWith({ foo: "bar" });
        },
        { handlers: { myAction: customHandler } },
      );
    })(),
  );

  it(
    "warns when no handler registered",
    component(async () => {
      const actionCtx = getActionContext();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await actionCtx.execute({ action: "unknownAction" });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("unknownAction"),
      );
      warnSpy.mockRestore();
    }),
  );

  it(
    "tracks loading state for actions",
    (() => {
      let resolveHandler: () => void;
      const slowHandler = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveHandler = resolve;
          }),
      );
      return component(
        async () => {
          const actionCtx = getActionContext();
          const executePromise = actionCtx.execute({ action: "slowAction" });

          expect(actionCtx.loadingActions.has("slowAction")).toBe(true);

          resolveHandler!();
          await executePromise;

          expect(actionCtx.loadingActions.has("slowAction")).toBe(false);
        },
        {
          handlers: {
            slowAction: slowHandler,
          },
        },
      );
    })(),
  );

  it(
    "allows registering handlers dynamically",
    component(async () => {
      const actionCtx = getActionContext();
      const dynamicHandler = vi.fn();

      actionCtx.registerHandler("dynamicAction", dynamicHandler);
      await actionCtx.execute({ action: "dynamicAction", params: { x: 1 } });

      expect(dynamicHandler).toHaveBeenCalledWith({ x: 1 });
    }),
  );

  it(
    "executes validateForm and writes result to /formValidation",
    component(
      async () => {
        const stateCtx = getStateContext();
        const actionCtx = getActionContext();
        const validationCtx = getValidationContext();

        validationCtx.registerField("/form/email", {
          checks: [{ type: "required", message: "Required" }],
        });

        await actionCtx.execute({ action: "validateForm" });

        expect(stateCtx.get("/formValidation")).toEqual({
          valid: false,
          errors: { "/form/email": ["Required"] },
        });
      },
      { withValidation: true },
    ),
  );

  it(
    "validateForm defaults to warning when validation context is missing",
    component(async () => {
      const actionCtx = getActionContext();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await actionCtx.execute({ action: "validateForm" });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("validateForm action was dispatched"),
      );
      warnSpy.mockRestore();
    }),
  );
});
