import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Box, Text, useInput } from "ink";
import {
  resolveAction,
  executeAction,
  type ActionBinding,
  type ActionHandler,
  type ActionConfirm,
  type ResolvedAction,
} from "@json-render/core";
import { useStateStore } from "./state";
import { useFocusDisable } from "./focus";

/**
 * Generate a unique ID for use with the "$id" token.
 * Uses crypto.randomUUID when available, otherwise a timestamp + random suffix.
 * No module-level mutable counter — safe across multiple render trees.
 */
function generateUniqueId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const MAX_RESOLVE_DEPTH = 10;

/**
 * Deep-resolve dynamic value references within an object.
 *
 * Supported tokens:
 * - `{ $state: "/statePath" }` - read a value from state
 * - `"$id"` (string) or `{ "$id": true }` - generate a unique ID
 */
function deepResolveValue(
  value: unknown,
  get: (path: string) => unknown,
  depth = 0,
): unknown {
  if (depth > MAX_RESOLVE_DEPTH) return value;
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

    const resolved: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      resolved[key] = deepResolveValue(val, get, depth + 1);
    }
    return resolved;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepResolveValue(item, get, depth + 1));
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
  /** Actions currently executing (count of in-flight executions per action name) */
  loadingActions: Map<string, number>;
  /** Pending confirmation dialog */
  pendingConfirmation: PendingConfirmation | null;
  /** Execute an action binding */
  execute: (binding: ActionBinding) => Promise<void>;
  /** Confirm the pending action */
  confirm: () => void;
  /** Cancel the pending action */
  cancel: () => void;
}

const ActionContext = createContext<ActionContextValue | null>(null);

/**
 * Props for ActionProvider
 */
export interface ActionProviderProps {
  /** Action handlers (custom handlers override built-in actions) */
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
  // Ref always holds the latest prop-based handlers (avoids stale closures
  // when createRenderer creates a new Proxy each render).
  const initialHandlersRef = useRef(initialHandlers);
  initialHandlersRef.current = initialHandlers;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [loadingActions, setLoadingActions] = useState<Map<string, number>>(
    new Map(),
  );
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);
  // Ref tracks current pending confirmation so overlapping confirms can
  // auto-reject the previous one without a stale closure.
  const pendingRef = useRef<PendingConfirmation | null>(null);

  const lookupHandler = useCallback(
    (name: string): ActionHandler | undefined =>
      initialHandlersRef.current[name],
    [],
  );

  const execute = useCallback(
    async (binding: ActionBinding) => {
      const resolved = resolveAction(binding, getSnapshot());

      // Check for custom handler override first — allows consumers to override
      // built-in actions like setState, pushState, etc.
      const customHandler = lookupHandler(resolved.action);

      // Built-in: setState (overridable)
      if (resolved.action === "setState" && !customHandler && resolved.params) {
        const statePath = resolved.params.statePath as string;
        const value = resolved.params.value;
        if (statePath) {
          set(statePath, value);
        }
        return;
      }

      // Built-in: pushState (overridable)
      if (
        resolved.action === "pushState" &&
        !customHandler &&
        resolved.params
      ) {
        const statePath = resolved.params.statePath as string;
        const rawValue = resolved.params.value;
        if (statePath) {
          const resolvedValue = deepResolveValue(rawValue, get);
          const raw = get(statePath);
          const arr = Array.isArray(raw) ? raw : [];
          set(statePath, [...arr, resolvedValue]);
          const clearStatePath = resolved.params.clearStatePath as
            | string
            | undefined;
          if (clearStatePath) {
            set(clearStatePath, "");
          }
        }
        return;
      }

      // Built-in: removeState (overridable)
      if (
        resolved.action === "removeState" &&
        !customHandler &&
        resolved.params
      ) {
        const statePath = resolved.params.statePath as string;
        const index = resolved.params.index as number;
        if (statePath !== undefined && index !== undefined) {
          const raw = get(statePath);
          if (!Array.isArray(raw)) return;
          set(
            statePath,
            raw.filter((_, i) => i !== index),
          );
        }
        return;
      }

      // Built-in: log (overridable)
      if (resolved.action === "log" && !customHandler) {
        const message =
          resolved.params?.message ?? resolved.params?.value ?? "";
        console.log("[json-render]", message);
        return;
      }

      // Built-in: exit (always delegates to handler if available)
      if (resolved.action === "exit" && !customHandler) {
        // No-op when no handler is provided
        return;
      }

      const handler = customHandler;

      if (!handler) {
        console.warn(
          `[json-render] No handler registered for action: ${resolved.action}`,
        );
        return;
      }

      // If confirmation is required, show dialog and wait for user response.
      // Uses resolve(boolean) instead of reject() to avoid unhandled rejections.
      if (resolved.confirm) {
        // Auto-reject any existing pending confirmation so its promise resolves
        // (prevents orphaned promises when a second confirm fires).
        pendingRef.current?.reject();

        const confirmed = await new Promise<boolean>((res) => {
          const entry: PendingConfirmation = {
            action: resolved,
            handler,
            resolve: () => {
              pendingRef.current = null;
              setPendingConfirmation(null);
              res(true);
            },
            reject: () => {
              pendingRef.current = null;
              setPendingConfirmation(null);
              res(false);
            },
          };
          pendingRef.current = entry;
          setPendingConfirmation(entry);
        });

        if (!confirmed) return;
      }

      const actionName = resolved.action;
      setLoadingActions((prev) => {
        const next = new Map(prev);
        next.set(actionName, (next.get(actionName) ?? 0) + 1);
        return next;
      });
      try {
        await executeAction({
          action: resolved,
          handler,
          setState: set,
          navigate: navigateRef.current,
          executeAction: async (name) => {
            const subBinding: ActionBinding = { action: name };
            await execute(subBinding);
          },
        });
      } finally {
        setLoadingActions((prev) => {
          const next = new Map(prev);
          const count = (next.get(actionName) ?? 1) - 1;
          if (count <= 0) {
            next.delete(actionName);
          } else {
            next.set(actionName, count);
          }
          return next;
        });
      }
    },
    [lookupHandler, get, set, getSnapshot],
  );

  // Use pendingRef for confirm/cancel to avoid stale closure issues
  const confirm = useCallback(() => {
    pendingRef.current?.resolve();
  }, []);

  const cancel = useCallback(() => {
    pendingRef.current?.reject();
  }, []);

  const value = useMemo<ActionContextValue>(
    () => ({
      handlers: initialHandlers,
      loadingActions,
      pendingConfirmation,
      execute,
      confirm,
      cancel,
    }),
    [
      initialHandlers,
      loadingActions,
      pendingConfirmation,
      execute,
      confirm,
      cancel,
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
 * Hook for a single action binding — returns execute and loading state.
 */
export function useAction(binding: ActionBinding): {
  execute: () => Promise<void>;
  isLoading: boolean;
} {
  const { execute, loadingActions } = useActions();
  const executeAction = useCallback(() => execute(binding), [execute, binding]);
  const isLoading = (loadingActions.get(binding.action) ?? 0) > 0;
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
 * Terminal confirmation dialog using Ink's Box/Text and useInput.
 * Press Y to confirm, N or Escape to cancel.
 */
export function ConfirmDialog({
  confirm,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isDanger = confirm.variant === "danger";

  // Suppress Tab cycling while modal is open
  useFocusDisable(true);

  // ConfirmDialog always captures input when mounted (it's modal)
  useInput((input, key) => {
    if (input.toLowerCase() === "y") {
      onConfirm();
    } else if (input.toLowerCase() === "n" || key.escape) {
      onCancel();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={isDanger ? "red" : "blue"}
      paddingX={2}
      paddingY={1}
    >
      <Text bold>{confirm.title}</Text>
      <Text dimColor>{confirm.message}</Text>
      <Box marginTop={1} gap={2}>
        <Text>
          <Text color={isDanger ? "red" : "green"} bold>
            [Y]
          </Text>{" "}
          {confirm.confirmLabel ?? "Confirm"}
        </Text>
        <Text>
          <Text bold>[N]</Text> {confirm.cancelLabel ?? "Cancel"}
        </Text>
      </Box>
    </Box>
  );
}
