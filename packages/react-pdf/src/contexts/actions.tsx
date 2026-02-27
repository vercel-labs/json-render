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

let idCounter = 0;
function generateUniqueId(): string {
  idCounter += 1;
  return `${Date.now()}-${idCounter}`;
}

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
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      resolved[key] = deepResolveValue(val, get);
    }
    return resolved;
  }

  return value;
}

export interface PendingConfirmation {
  action: ResolvedAction;
  handler: ActionHandler;
  resolve: () => void;
  reject: () => void;
}

export interface ActionContextValue {
  handlers: Record<string, ActionHandler>;
  loadingActions: Set<string>;
  pendingConfirmation: PendingConfirmation | null;
  execute: (binding: ActionBinding) => Promise<void>;
  confirm: () => void;
  cancel: () => void;
  registerHandler: (name: string, handler: ActionHandler) => void;
}

const ActionContext = createContext<ActionContextValue | null>(null);

export interface ActionProviderProps {
  handlers?: Record<string, ActionHandler>;
  navigate?: (path: string) => void;
  children: ReactNode;
}

export function ActionProvider({
  handlers: initialHandlers = {},
  navigate,
  children,
}: ActionProviderProps) {
  const { get, set, getSnapshot } = useStateStore();
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

      if (resolved.action === "setState" && resolved.params) {
        const statePath = resolved.params.statePath as string;
        const value = resolved.params.value;
        if (statePath) {
          set(statePath, value);
        }
        return;
      }

      if (resolved.action === "pushState" && resolved.params) {
        const statePath = resolved.params.statePath as string;
        const rawValue = resolved.params.value;
        if (statePath) {
          const resolvedValue = deepResolveValue(rawValue, get);
          const arr = (get(statePath) as unknown[] | undefined) ?? [];
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

      const handler = handlers[resolved.action];

      if (!handler) {
        console.warn(`No handler registered for action: ${resolved.action}`);
        return;
      }

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
    [handlers, get, set, getSnapshot, navigate],
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

export function useActions(): ActionContextValue {
  const ctx = useContext(ActionContext);
  if (!ctx) {
    throw new Error("useActions must be used within an ActionProvider");
  }
  return ctx;
}

export function useAction(binding: ActionBinding): {
  execute: () => Promise<void>;
  isLoading: boolean;
} {
  const { execute, loadingActions } = useActions();
  const isLoading = loadingActions.has(binding.action);

  const executeAction = useCallback(() => execute(binding), [execute, binding]);

  return { execute: executeAction, isLoading };
}

export interface ConfirmDialogProps {
  confirm: ActionConfirm;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * No-op confirm dialog for PDF context. PDFs are non-interactive,
 * so confirmations are not rendered.
 */
export function ConfirmDialog(_props: ConfirmDialogProps) {
  return null;
}
