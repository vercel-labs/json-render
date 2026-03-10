import {
  computed,
  defineComponent,
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
 * Show a confirmation dialog using UniApp's native modal API.
 * Falls back to a Promise that resolves immediately if `uni` is unavailable.
 */
function getUniGlobal(): UniInstance | undefined {
  if (typeof uni !== "undefined") return uni;
  return (globalThis as Record<string, unknown>).uni as UniInstance | undefined;
}

function showConfirmModal(confirm: ActionConfirm): Promise<boolean> {
  const uniObj = getUniGlobal();

  if (!uniObj?.showModal) {
    // Fallback: use browser confirm() if available, or auto-confirm
    if (typeof window !== "undefined" && window.confirm) {
      return Promise.resolve(window.confirm(confirm.message));
    }
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    uniObj.showModal({
      title: confirm.title ?? "Confirm",
      content: confirm.message,
      confirmText: confirm.confirmLabel ?? "Confirm",
      cancelText: confirm.cancelLabel ?? "Cancel",
      confirmColor: confirm.variant === "danger" ? "#dc2626" : "#3b82f6",
      success: (res) => {
        resolve(res.confirm);
      },
      fail: () => {
        resolve(false);
      },
    });
  });
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

      // Built-in: navigateTo — UniApp page navigation
      if (resolved.action === "navigateTo" && resolved.params) {
        const url = resolved.params.url as string;
        if (url) {
          if (props.navigate) {
            props.navigate(url);
          } else {
            getUniGlobal()?.navigateTo({ url });
          }
        }
        return;
      }

      // Built-in: navigateBack — UniApp back navigation
      if (resolved.action === "navigateBack") {
        const delta = (resolved.params?.delta as number) ?? 1;
        getUniGlobal()?.navigateBack({ delta });
        return;
      }

      // Built-in: redirectTo — UniApp redirect (replaces current page)
      if (resolved.action === "redirectTo" && resolved.params) {
        const url = resolved.params.url as string;
        if (url) {
          getUniGlobal()?.redirectTo({ url });
        }
        return;
      }

      // Built-in: switchTab — UniApp tab navigation
      if (resolved.action === "switchTab" && resolved.params) {
        const url = resolved.params.url as string;
        if (url) {
          getUniGlobal()?.switchTab({ url });
        }
        return;
      }

      // Built-in: push (state-based navigation — kept for compatibility)
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

      // Built-in: pop (state-based navigation — kept for compatibility)
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

      // If confirmation is required, use uni.showModal
      if (resolved.confirm) {
        const confirmed = await showConfirmModal(resolved.confirm);
        if (!confirmed) return;

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
// ConfirmDialog — no-op in UniApp (confirmation is handled via uni.showModal)
// =============================================================================

/**
 * Props for ConfirmDialog component (kept for API compatibility with Vue package)
 */
export interface ConfirmDialogProps {
  confirm: ActionConfirm;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In UniApp, confirmation dialogs are shown via `uni.showModal()` instead of
 * rendering a DOM overlay. This component is a no-op placeholder kept for
 * API compatibility with the Vue package.
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
  setup() {
    // UniApp uses native modals — nothing to render here
    return () => null;
  },
});
