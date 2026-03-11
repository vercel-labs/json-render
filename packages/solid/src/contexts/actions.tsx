import {
  createContext,
  useContext,
  createSignal,
  type ParentProps,
  type JSX,
} from "solid-js";
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
}

export function ActionProvider(props: ParentProps<ActionProviderProps>) {
  const { get, set, getSnapshot } = useStateStore();
  const validation = useOptionalValidation();

  const [handlers, setHandlers] = createSignal<Record<string, ActionHandler>>(
    props.handlers ?? {},
  );
  const [loadingActions, setLoadingActions] = createSignal<Set<string>>(
    new Set(),
  );
  const [pendingConfirmation, setPendingConfirmation] =
    createSignal<PendingConfirmation | null>(null);

  const registerHandler = (name: string, handler: ActionHandler) => {
    setHandlers((prev) => ({ ...prev, [name]: handler }));
  };

  const execute = async (binding: ActionBinding) => {
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

    const handler = handlers()[resolved.action];

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
            navigate: props.navigate,
            executeAction: async (name: string) => {
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
        navigate: props.navigate,
        executeAction: async (name: string) => {
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
  };

  const confirm = () => {
    pendingConfirmation()?.resolve();
  };

  const cancel = () => {
    pendingConfirmation()?.reject();
  };

  const ctx: ActionContextValue = {
    get handlers() {
      return handlers();
    },
    get loadingActions() {
      return loadingActions();
    },
    get pendingConfirmation() {
      return pendingConfirmation();
    },
    execute,
    confirm,
    cancel,
    registerHandler,
  };

  return (
    <ActionContext.Provider value={ctx}>
      {props.children}
    </ActionContext.Provider>
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
  const actions = useActions();
  return {
    execute: () => actions.execute(binding),
    get isLoading() {
      return actions.loadingActions.has(binding.action);
    },
  };
}

export interface ConfirmDialogProps {
  confirm: ActionConfirm;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog(props: ConfirmDialogProps): JSX.Element {
  const isDanger = () => props.confirm.variant === "danger";

  return (
    <div
      style={{
        position: "fixed",
        inset: "0",
        "background-color": "rgba(0, 0, 0, 0.5)",
        display: "flex",
        "align-items": "center",
        "justify-content": "center",
        "z-index": 50,
      }}
      onClick={props.onCancel}
    >
      <div
        style={{
          "background-color": "white",
          "border-radius": "8px",
          padding: "24px",
          "max-width": "400px",
          width: "100%",
          "box-shadow": "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            margin: "0 0 8px 0",
            "font-size": "18px",
            "font-weight": "600",
          }}
        >
          {props.confirm.title}
        </h3>
        <p
          style={{
            margin: "0 0 24px 0",
            color: "#6b7280",
          }}
        >
          {props.confirm.message}
        </p>
        <div
          style={{
            display: "flex",
            gap: "12px",
            "justify-content": "flex-end",
          }}
        >
          <button
            onClick={props.onCancel}
            style={{
              padding: "8px 16px",
              "border-radius": "6px",
              border: "1px solid #d1d5db",
              "background-color": "white",
              cursor: "pointer",
            }}
          >
            {props.confirm.cancelLabel ?? "Cancel"}
          </button>
          <button
            onClick={props.onConfirm}
            style={{
              padding: "8px 16px",
              "border-radius": "6px",
              border: "none",
              "background-color": isDanger() ? "#dc2626" : "#3b82f6",
              color: "white",
              cursor: "pointer",
            }}
          >
            {props.confirm.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
