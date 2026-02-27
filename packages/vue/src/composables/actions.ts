import {
  computed,
  defineComponent,
  h,
  inject,
  provide,
  ref,
  watch,
  type ComputedRef,
  type PropType,
} from "vue";
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
  action: ResolvedAction;
  handler: ActionHandler;
  resolve: () => void;
  reject: () => void;
}

/**
 * Action context value
 */
export interface ActionContextValue {
  handlers: Record<string, ActionHandler>;
  loadingActions: Set<string>;
  pendingConfirmation: PendingConfirmation | null;
  execute: (binding: ActionBinding) => Promise<void>;
  confirm: () => void;
  cancel: () => void;
  registerHandler: (name: string, handler: ActionHandler) => void;
}

const ACTIONS_KEY = Symbol("json-render:actions");

export interface ActionProviderProps {
  handlers?: Record<string, ActionHandler>;
  navigate?: (path: string) => void;
}

/**
 * Provider for action execution
 */
export const ActionProvider = defineComponent({
  name: "ActionProvider",
  props: {
    handlers: {
      type: Object as PropType<Record<string, ActionHandler>>,
      default: () => ({}),
    },
    navigate: {
      type: Function as PropType<(path: string) => void>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const { get, set, getSnapshot } = useStateStore();
    const validation = useOptionalValidation();

    const handlers = ref<Record<string, ActionHandler>>(props.handlers ?? {});
    const loadingActions = ref<Set<string>>(new Set());
    const pendingConfirmation = ref<PendingConfirmation | null>(null);

    // Sync handlers when prop changes
    watch(
      () => props.handlers,
      (newHandlers) => {
        if (newHandlers) handlers.value = newHandlers;
      },
    );

    const registerHandler = (name: string, handler: ActionHandler) => {
      handlers.value = { ...handlers.value, [name]: handler };
    };

    const execute = async (binding: ActionBinding): Promise<void> => {
      const resolved = resolveAction(binding, getSnapshot());

      // Built-in: setState
      if (resolved.action === "setState" && resolved.params) {
        const statePath = resolved.params.statePath as string;
        const value = resolved.params.value;
        if (statePath) {
          set(statePath, value);
        }
        return;
      }

      // Built-in: pushState
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

      // Built-in: removeState
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

      // Built-in: validateForm — triggers validateAll and writes result to state
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

      // Built-in: push (navigation)
      if (resolved.action === "push" && resolved.params) {
        const screen = resolved.params.screen as string;
        if (screen) {
          const currentScreen = get("/currentScreen") as string | undefined;
          const navStack = (get("/navStack") as string[] | undefined) ?? [];
          if (currentScreen) {
            set("/navStack", [...navStack, currentScreen]);
          } else {
            set("/navStack", [...navStack, ""]);
          }
          set("/currentScreen", screen);
        }
        return;
      }

      // Built-in: pop (navigation)
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

      const handler = handlers.value[resolved.action];

      if (!handler) {
        console.warn(`No handler registered for action: ${resolved.action}`);
        return;
      }

      // If confirmation is required, show dialog first
      if (resolved.confirm) {
        await new Promise<void>((resolve, reject) => {
          pendingConfirmation.value = {
            action: resolved,
            handler,
            resolve: () => {
              pendingConfirmation.value = null;
              resolve();
            },
            reject: () => {
              pendingConfirmation.value = null;
              reject(new Error("Action cancelled"));
            },
          };
        });

        const addLoading = new Set(loadingActions.value);
        addLoading.add(resolved.action);
        loadingActions.value = addLoading;
        try {
          await executeAction({
            action: resolved,
            handler,
            setState: set,
            navigate: props.navigate,
            executeAction: async (name) => {
              const subBinding: ActionBinding = { action: name };
              await execute(subBinding);
            },
          });
        } finally {
          const removeLoading = new Set(loadingActions.value);
          removeLoading.delete(resolved.action);
          loadingActions.value = removeLoading;
        }
        return;
      }

      // Execute immediately
      const addLoading = new Set(loadingActions.value);
      addLoading.add(resolved.action);
      loadingActions.value = addLoading;
      try {
        await executeAction({
          action: resolved,
          handler,
          setState: set,
          navigate: props.navigate,
          executeAction: async (name) => {
            const subBinding: ActionBinding = { action: name };
            await execute(subBinding);
          },
        });
      } finally {
        const removeLoading = new Set(loadingActions.value);
        removeLoading.delete(resolved.action);
        loadingActions.value = removeLoading;
      }
    };

    const confirm = () => pendingConfirmation.value?.resolve();
    const cancel = () => pendingConfirmation.value?.reject();

    provide<ActionContextValue>(ACTIONS_KEY, {
      get handlers() {
        return handlers.value;
      },
      get loadingActions() {
        return loadingActions.value;
      },
      get pendingConfirmation() {
        return pendingConfirmation.value;
      },
      execute,
      confirm,
      cancel,
      registerHandler,
    });

    return () => slots.default?.();
  },
});

/**
 * Composable to access action context
 */
export function useActions(): ActionContextValue {
  const ctx = inject<ActionContextValue>(ACTIONS_KEY);
  if (!ctx) {
    throw new Error("useActions must be used within an ActionProvider");
  }
  return ctx;
}

/**
 * Composable to execute an action binding
 */
export function useAction(binding: ActionBinding): {
  execute: () => Promise<void>;
  isLoading: ComputedRef<boolean>;
} {
  const ctx = useActions();
  return {
    execute: () => ctx.execute(binding),
    isLoading: computed(() => ctx.loadingActions.has(binding.action)),
  };
}

// =============================================================================
// ConfirmDialog component
// =============================================================================

/**
 * Props for ConfirmDialog component
 */
export interface ConfirmDialogProps {
  confirm: ActionConfirm;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Default confirmation dialog component
 */
export const ConfirmDialog = defineComponent({
  name: "ConfirmDialog",
  props: {
    confirm: {
      type: Object as PropType<ActionConfirm>,
      required: true,
    },
    onConfirm: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onCancel: {
      type: Function as PropType<() => void>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const isDanger = props.confirm.variant === "danger";

      return h(
        "div",
        {
          style: {
            position: "fixed",
            inset: "0",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: "50",
          },
          onClick: props.onCancel,
        },
        [
          h(
            "div",
            {
              style: {
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "24px",
                maxWidth: "400px",
                width: "100%",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              },
              onClick: (e: MouseEvent) => e.stopPropagation(),
            },
            [
              h(
                "h3",
                {
                  style: {
                    margin: "0 0 8px 0",
                    fontSize: "18px",
                    fontWeight: "600",
                  },
                },
                props.confirm.title,
              ),
              h(
                "p",
                {
                  style: { margin: "0 0 24px 0", color: "#6b7280" },
                },
                props.confirm.message,
              ),
              h(
                "div",
                {
                  style: {
                    display: "flex",
                    gap: "12px",
                    justifyContent: "flex-end",
                  },
                },
                [
                  h(
                    "button",
                    {
                      style: {
                        padding: "8px 16px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        backgroundColor: "white",
                        cursor: "pointer",
                      },
                      onClick: props.onCancel,
                    },
                    props.confirm.cancelLabel ?? "Cancel",
                  ),
                  h(
                    "button",
                    {
                      style: {
                        padding: "8px 16px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: isDanger ? "#dc2626" : "#3b82f6",
                        color: "white",
                        cursor: "pointer",
                      },
                      onClick: props.onConfirm,
                    },
                    props.confirm.confirmLabel ?? "Confirm",
                  ),
                ],
              ),
            ],
          ),
        ],
      );
    };
  },
});
