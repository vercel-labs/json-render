<script module lang="ts">
  import { getContext } from "svelte";
  import type {
    ActionBinding,
    ActionConfirm,
    ActionHandler,
    ResolvedAction,
  } from "@json-render/core";

  const ACTION_KEY = Symbol.for("json-render-actions");

  /**
   * Pending confirmation state
   */
  export interface PendingConfirmation {
    action: ResolvedAction;
    handler: ActionHandler;
    resolve: () => void;
    reject: () => void;
  }

  export interface CurrentValue<T> {
    readonly current: T;
  }

  /**
   * Action context value
   */
  export interface ActionContext {
    /** Registered action handlers */
    handlers: Record<string, ActionHandler>;
    /** Currently loading action names */
    loadingActions: Set<string>;
    /** Pending confirmation dialog */
    pendingConfirmation: PendingConfirmation | null;
    /** Execute an action binding */
    execute: (binding: ActionBinding) => Promise<void>;
    /** Confirm the pending action */
    confirm: () => void;
    /** Cancel the pending action */
    cancel: () => void;
    /** Register an action handler */
    registerHandler: (name: string, handler: ActionHandler) => void;
  }

  /**
   * Get the action context from component tree
   */
  export function getActionContext(): ActionContext {
    const ctx = getContext<ActionContext>(ACTION_KEY);
    if (!ctx) {
      throw new Error(
        "getActionContext must be called within an ActionProvider",
      );
    }
    return ctx;
  }

  /**
   * Convenience helper to get a registered action handler by name
   */
  export function getAction(
    name: string,
  ): CurrentValue<ActionHandler | undefined> {
    const context = getActionContext();
    return {
      get current() {
        return context.handlers[name];
      },
    };
  }

  /**
   * Props for ConfirmDialog component
   */
  export interface ConfirmDialogProps {
    /** The confirmation config */
    confirm: ActionConfirm;
    /** Called when confirmed */
    onConfirm: () => void;
    /** Called when cancelled */
    onCancel: () => void;
  }

  /**
   * Generate a unique ID for use with the "$id" token.
   */
  let idCounter = 0;
  function generateUniqueId(): string {
    idCounter += 1;
    return `${Date.now()}-${idCounter}`;
  }

  /**
   * Deep-resolve dynamic value references within an object.
   */
  function deepResolveValue(
    value: unknown,
    get: (path: string) => unknown,
  ): unknown {
    if (value === null || value === undefined) return value;

    if (value === "$id") {
      return generateUniqueId();
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj);

      if (keys.length === 1 && typeof obj.$state === "string") {
        return get(obj.$state as string);
      }

      if (keys.length === 1 && "$id" in obj) {
        return generateUniqueId();
      }
    }

    if (Array.isArray(value)) {
      return value.map((item) => deepResolveValue(item, get));
    }

    if (typeof value === "object") {
      const resolved: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(
        value as Record<string, unknown>,
      )) {
        resolved[key] = deepResolveValue(val, get);
      }
      return resolved;
    }

    return value;
  }
</script>

<script lang="ts">
  import { setContext, type Snippet } from "svelte";
  import {
    resolveAction,
    executeAction,
    type ActionBinding as CoreActionBinding,
    type ActionHandler as CoreActionHandler,
  } from "@json-render/core";
  import { getStateContext } from "./StateProvider.svelte";
  import { getOptionalValidationContext } from "./ValidationProvider.svelte";
  import { SvelteSet } from "svelte/reactivity";

  interface Props {
    handlers?: Record<string, CoreActionHandler>;
    navigate?: (path: string) => void;
    children?: Snippet;
  }

  let { handlers = {}, navigate, children }: Props = $props();

  const stateCtx = getStateContext();
  const validation = getOptionalValidationContext();

  let registeredHandlers = $state.raw<Record<string, CoreActionHandler>>({});
  let loadingActions = new SvelteSet<string>();
  let pendingConfirmation = $state.raw<PendingConfirmation | null>(null);

  const execute = async (binding: CoreActionBinding): Promise<void> => {
    const resolved = resolveAction(binding, stateCtx.getSnapshot());

    if (resolved.action === "setState" && resolved.params) {
      const statePath = resolved.params.statePath as string;
      const value = resolved.params.value;
      if (statePath) {
        stateCtx.set(statePath, value);
      }
      return;
    }

    if (resolved.action === "pushState" && resolved.params) {
      const statePath = resolved.params.statePath as string;
      const rawValue = resolved.params.value;
      if (statePath) {
        const resolvedValue = deepResolveValue(rawValue, stateCtx.get);
        const arr = (stateCtx.get(statePath) as unknown[] | undefined) ?? [];
        stateCtx.set(statePath, [...arr, resolvedValue]);
        const clearStatePath = resolved.params.clearStatePath as
          | string
          | undefined;
        if (clearStatePath) {
          stateCtx.set(clearStatePath, "");
        }
      }
      return;
    }

    if (resolved.action === "removeState" && resolved.params) {
      const statePath = resolved.params.statePath as string;
      const index = resolved.params.index as number;
      if (statePath !== undefined && index !== undefined) {
        const arr = (stateCtx.get(statePath) as unknown[] | undefined) ?? [];
        stateCtx.set(
          statePath,
          arr.filter((_, i) => i !== index),
        );
      }
      return;
    }

    if (resolved.action === "validateForm") {
      if (!validation?.validateAll) {
        console.warn(
          "validateForm action was dispatched but no ValidationProvider is connected. " +
            "Ensure ValidationProvider is rendered inside the provider tree.",
        );
        return;
      }
      const valid = validation.validateAll();
      const errors: Record<string, string[]> = {};
      for (const [path, fieldState] of Object.entries(validation.fieldStates)) {
        if (fieldState.result && !fieldState.result.valid) {
          errors[path] = fieldState.result.errors;
        }
      }
      const statePath =
        (resolved.params?.statePath as string) || "/formValidation";
      stateCtx.set(statePath, { valid, errors });
      return;
    }

    if (resolved.action === "push" && resolved.params) {
      const screen = resolved.params.screen as string;
      if (screen) {
        const currentScreen = stateCtx.get("/currentScreen") as
          | string
          | undefined;
        const navStack =
          (stateCtx.get("/navStack") as string[] | undefined) ?? [];
        if (currentScreen) {
          stateCtx.set("/navStack", [...navStack, currentScreen]);
        } else {
          stateCtx.set("/navStack", [...navStack, ""]);
        }
        stateCtx.set("/currentScreen", screen);
      }
      return;
    }

    if (resolved.action === "pop") {
      const navStack =
        (stateCtx.get("/navStack") as string[] | undefined) ?? [];
      if (navStack.length > 0) {
        const previousScreen = navStack[navStack.length - 1];
        stateCtx.set("/navStack", navStack.slice(0, -1));
        if (previousScreen) {
          stateCtx.set("/currentScreen", previousScreen);
        } else {
          stateCtx.set("/currentScreen", undefined);
        }
      }
      return;
    }

    const handler =
      registeredHandlers[resolved.action] ?? handlers[resolved.action];

    if (!handler) {
      console.warn(`No handler registered for action: ${resolved.action}`);
      return;
    }

    if (resolved.confirm) {
      return new Promise<void>((resolve, reject) => {
        pendingConfirmation = {
          action: resolved,
          handler,
          resolve: () => {
            pendingConfirmation = null;
            resolve();
          },
          reject: () => {
            pendingConfirmation = null;
            reject(new Error("Action cancelled"));
          },
        };
      }).then(async () => {
        loadingActions.add(resolved.action);
        try {
          await executeAction({
            action: resolved,
            handler,
            setState: stateCtx.set,
            navigate,
            executeAction: async (name) => {
              const subBinding: CoreActionBinding = { action: name };
              await execute(subBinding);
            },
          });
        } finally {
          loadingActions.delete(resolved.action);
        }
      });
    }

    loadingActions.add(resolved.action);
    try {
      await executeAction({
        action: resolved,
        handler,
        setState: stateCtx.set,
        navigate,
        executeAction: async (name) => {
          const subBinding: CoreActionBinding = { action: name };
          await execute(subBinding);
        },
      });
    } finally {
      loadingActions.delete(resolved.action);
    }
  };

  const ctx: ActionContext = {
    get handlers() {
      return { ...handlers, ...registeredHandlers };
    },
    get loadingActions() {
      return loadingActions;
    },
    get pendingConfirmation() {
      return pendingConfirmation;
    },
    execute,
    confirm: () => {
      pendingConfirmation?.resolve();
    },
    cancel: () => {
      pendingConfirmation?.reject();
    },
    registerHandler: (name: string, handler: CoreActionHandler) => {
      registeredHandlers = { ...registeredHandlers, [name]: handler };
    },
  };

  setContext(ACTION_KEY, ctx);
</script>

{@render children?.()}
