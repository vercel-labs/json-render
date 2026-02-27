"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  resolveAction,
  executeAction,
  type ActionBinding,
  type ActionHandler,
  type ActionConfirm,
  type ResolvedAction,
} from "@json-render/core";
import { useStateStore } from "./state";
import { useOptionalValidation } from "./validation";

/**
 * Generate a unique ID for use with the "$id" token.
 * Combines a timestamp with a random suffix for uniqueness.
 */
let idCounter = 0;
function generateUniqueId(): string {
  idCounter += 1;
  return `${Date.now()}-${idCounter}`;
}

/**
 * Deep-resolve dynamic value references within an object.
 *
 * Supported tokens:
 * - `{ $state: "/statePath" }` - read a value from state
 * - `"$id"` (string) or `{ "$id": true }` - generate a unique ID
 *
 * This allows pushState values to contain references to current state
 * and auto-generated IDs.
 */
function deepResolveValue(
  value: unknown,
  get: (path: string) => unknown,
): unknown {
  if (value === null || value === undefined) return value;

  // "$id" string token -> generate unique ID
  if (value === "$id") {
    return generateUniqueId();
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);

    // { $state: "/foo" } -> read from state
    if (keys.length === 1 && typeof obj.$state === "string") {
      return get(obj.$state as string);
    }

    // { "$id": true } -> generate unique ID (single-key object)
    if (keys.length === 1 && "$id" in obj) {
      return generateUniqueId();
    }
  }

  // Recurse into arrays
  if (Array.isArray(value)) {
    return value.map((item) => deepResolveValue(item, get));
  }

  // Recurse into plain objects
  if (typeof value === "object") {
    const resolved: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      resolved[key] = deepResolveValue(val, get);
    }
    return resolved;
  }

  return value;
}

/**
 * Pending confirmation state
 */
export interface PendingConfirmation {
  /** The resolved action */
  action: ResolvedAction;
  /** The action handler */
  handler: ActionHandler;
  /** Resolve callback */
  resolve: () => void;
  /** Reject callback */
  reject: () => void;
}

/**
 * Action context value
 */
export interface ActionContextValue {
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

const ActionContext = createContext<ActionContextValue | null>(null);

/**
 * Props for ActionProvider
 */
export interface ActionProviderProps {
  /** Initial action handlers */
  handlers?: Record<string, ActionHandler>;
  /** Navigation function */
  navigate?: (path: string) => void;
  children: ReactNode;
}

/**
 * Provider for action execution
 */
export function ActionProvider({
  handlers: initialHandlers = {},
  navigate,
  children,
}: ActionProviderProps) {
  const { get, set, getSnapshot } = useStateStore();
  const validation = useOptionalValidation();

  const [handlers, setHandlers] =
    useState<Record<string, ActionHandler>>(initialHandlers);
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);

  const registerHandler = useCallback(
    (name: string, handler: ActionHandler) => {
      setHandlers((prev) => ({ ...prev, [name]: handler }));
    },
    [],
  );

  const execute = useCallback(
    async (binding: ActionBinding) => {
      const resolved = resolveAction(binding, getSnapshot());

      // Built-in: setState updates the StateProvider state directly
      if (resolved.action === "setState" && resolved.params) {
        const statePath = resolved.params.statePath as string;
        const value = resolved.params.value;
        if (statePath) {
          set(statePath, value);
        }
        return;
      }

      // Built-in: pushState appends an item to an array in state.
      // Supports dynamic values inside the value object via { $state: "/..." } syntax.
      if (resolved.action === "pushState" && resolved.params) {
        const statePath = resolved.params.statePath as string;
        const rawValue = resolved.params.value;
        if (statePath) {
          const resolvedValue = deepResolveValue(rawValue, get);
          const arr = (get(statePath) as unknown[] | undefined) ?? [];
          set(statePath, [...arr, resolvedValue]);
          // Optionally clear a state path after pushing (e.g. clear the input)
          const clearStatePath = resolved.params.clearStatePath as
            | string
            | undefined;
          if (clearStatePath) {
            set(clearStatePath, "");
          }
        }
        return;
      }

      // Built-in: removeState removes an item from an array in state by index.
      if (resolved.action === "removeState" && resolved.params) {
        const statePath = resolved.params.statePath as string;
        const index = resolved.params.index as number;
        if (statePath !== undefined && index !== undefined) {
          const arr = (get(statePath) as unknown[] | undefined) ?? [];
          set(
            statePath,
            arr.filter((_, i) => i !== index),
          );
        }
        return;
      }

      // Built-in: push navigates to a new screen by updating state.
      // Pushes the current screen onto /navStack and sets /currentScreen.
      if (resolved.action === "push" && resolved.params) {
        const screen = resolved.params.screen as string;
        if (screen) {
          const currentScreen = get("/currentScreen") as string | undefined;
          const navStack = (get("/navStack") as string[] | undefined) ?? [];
          if (currentScreen) {
            set("/navStack", [...navStack, currentScreen]);
          } else {
            // No current screen set yet -- push a sentinel so pop returns here
            set("/navStack", [...navStack, ""]);
          }
          set("/currentScreen", screen);
        }
        return;
      }

      // Built-in: pop navigates back to the previous screen.
      // Pops the last entry from /navStack and restores /currentScreen.
      if (resolved.action === "pop") {
        const navStack = (get("/navStack") as string[] | undefined) ?? [];
        if (navStack.length > 0) {
          const previousScreen = navStack[navStack.length - 1];
          set("/navStack", navStack.slice(0, -1));
          if (previousScreen) {
            set("/currentScreen", previousScreen);
          } else {
            set("/currentScreen", undefined);
          }
        }
        return;
      }

      // Built-in: validateForm triggers validateAll from the ValidationProvider
      // and writes the result to a state path (default: /formValidation).
      // IMPORTANT: validateAll() is synchronous — it runs all registered field
      // validations and returns immediately. This guarantees that the next action
      // in a sequential list (e.g. [validateForm, submitForm]) can read the
      // validation result from state without awaiting an extra tick.
      if (resolved.action === "validateForm") {
        const validateAll = validation?.validateAll;
        if (!validateAll) {
          console.warn(
            "validateForm action was dispatched but no ValidationProvider is connected. " +
              "Ensure ValidationProvider is rendered inside the provider tree.",
          );
          return;
        }
        const valid = validateAll();
        const errors: Record<string, string[]> = {};
        for (const [path, fs] of Object.entries(validation.fieldStates)) {
          if (fs.result && !fs.result.valid) {
            errors[path] = fs.result.errors;
          }
        }
        const statePath =
          (resolved.params?.statePath as string) || "/formValidation";
        set(statePath, { valid, errors });
        return;
      }

      const handler = handlers[resolved.action];

      if (!handler) {
        console.warn(`No handler registered for action: ${resolved.action}`);
        return;
      }

      // If confirmation is required, show dialog
      if (resolved.confirm) {
        return new Promise<void>((resolve, reject) => {
          setPendingConfirmation({
            action: resolved,
            handler,
            resolve: () => {
              setPendingConfirmation(null);
              resolve();
            },
            reject: () => {
              setPendingConfirmation(null);
              reject(new Error("Action cancelled"));
            },
          });
        }).then(async () => {
          setLoadingActions((prev) => new Set(prev).add(resolved.action));
          try {
            await executeAction({
              action: resolved,
              handler,
              setState: set,
              navigate,
              executeAction: async (name) => {
                const subBinding: ActionBinding = { action: name };
                await execute(subBinding);
              },
            });
          } finally {
            setLoadingActions((prev) => {
              const next = new Set(prev);
              next.delete(resolved.action);
              return next;
            });
          }
        });
      }

      // Execute immediately
      setLoadingActions((prev) => new Set(prev).add(resolved.action));
      try {
        await executeAction({
          action: resolved,
          handler,
          setState: set,
          navigate,
          executeAction: async (name) => {
            const subBinding: ActionBinding = { action: name };
            await execute(subBinding);
          },
        });
      } finally {
        setLoadingActions((prev) => {
          const next = new Set(prev);
          next.delete(resolved.action);
          return next;
        });
      }
    },
    [handlers, get, set, getSnapshot, navigate, validation],
  );

  const confirm = useCallback(() => {
    pendingConfirmation?.resolve();
  }, [pendingConfirmation]);

  const cancel = useCallback(() => {
    pendingConfirmation?.reject();
  }, [pendingConfirmation]);

  const value = useMemo<ActionContextValue>(
    () => ({
      handlers,
      loadingActions,
      pendingConfirmation,
      execute,
      confirm,
      cancel,
      registerHandler,
    }),
    [
      handlers,
      loadingActions,
      pendingConfirmation,
      execute,
      confirm,
      cancel,
      registerHandler,
    ],
  );

  return (
    <ActionContext.Provider value={value}>{children}</ActionContext.Provider>
  );
}

/**
 * Hook to access action context
 */
export function useActions(): ActionContextValue {
  const ctx = useContext(ActionContext);
  if (!ctx) {
    throw new Error("useActions must be used within an ActionProvider");
  }
  return ctx;
}

/**
 * Hook to execute an action binding
 */
export function useAction(binding: ActionBinding): {
  execute: () => Promise<void>;
  isLoading: boolean;
} {
  const { execute, loadingActions } = useActions();
  const isLoading = loadingActions.has(binding.action);

  const executeAction = useCallback(() => execute(binding), [execute, binding]);

  return { execute: executeAction, isLoading };
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
 * Default confirmation dialog component
 */
export function ConfirmDialog({
  confirm,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isDanger = confirm.variant === "danger";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "400px",
          width: "100%",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            margin: "0 0 8px 0",
            fontSize: "18px",
            fontWeight: 600,
          }}
        >
          {confirm.title}
        </h3>
        <p
          style={{
            margin: "0 0 24px 0",
            color: "#6b7280",
          }}
        >
          {confirm.message}
        </p>
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              backgroundColor: "white",
              cursor: "pointer",
            }}
          >
            {confirm.cancelLabel ?? "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: isDanger ? "#dc2626" : "#3b82f6",
              color: "white",
              cursor: "pointer",
            }}
          >
            {confirm.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
