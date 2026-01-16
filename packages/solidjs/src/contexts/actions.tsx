import {
  createContext,
  useContext,
  createSignal,
  type JSX,
  type Accessor,
} from "solid-js";
import {
  resolveAction,
  executeAction,
  type Action,
  type ActionHandler,
  type ActionConfirm,
  type ResolvedAction,
} from "@json-render/core";
import { useData } from "./data";

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
  /** Registered action handlers (accessor) */
  handlers: Accessor<Record<string, ActionHandler>>;
  /** Currently loading action names (accessor) */
  loadingActions: Accessor<Set<string>>;
  /** Pending confirmation dialog (accessor) */
  pendingConfirmation: Accessor<PendingConfirmation | null>;
  /** Execute an action */
  execute: (action: Action) => Promise<void>;
  /** Confirm the pending action */
  confirm: () => void;
  /** Cancel the pending action */
  cancel: () => void;
  /** Register an action handler */
  registerHandler: (name: string, handler: ActionHandler) => void;
}

const ActionContext = createContext<ActionContextValue>();

/**
 * Props for ActionProvider
 */
export interface ActionProviderProps {
  /** Initial action handlers */
  handlers?: Record<string, ActionHandler>;
  /** Navigation function */
  navigate?: (path: string) => void;
  children: JSX.Element;
}

/**
 * Provider for action execution
 */
export function ActionProvider(props: ActionProviderProps) {
  const { data, set } = useData();
  const [handlers, setHandlers] = createSignal<Record<string, ActionHandler>>(
    props.handlers ?? {},
  );
  const [loadingActions, setLoadingActions] = createSignal<Set<string>>(
    new Set(),
  );
  const [pendingConfirmation, setPendingConfirmation] =
    createSignal<PendingConfirmation | null>(null);

  const registerHandler = (name: string, handler: ActionHandler): void => {
    setHandlers((prev) => ({ ...prev, [name]: handler }));
  };

  const execute = async (action: Action): Promise<void> => {
    const resolved = resolveAction(action, data());
    const handler = handlers()[resolved.name];

    if (!handler) {
      console.warn(`No handler registered for action: ${resolved.name}`);
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
        setLoadingActions((prev) => new Set(prev).add(resolved.name));
        try {
          await executeAction({
            action: resolved,
            handler,
            setData: set,
            navigate: props.navigate,
            executeAction: async (name) => {
              const subAction: Action = { name };
              await execute(subAction);
            },
          });
        } finally {
          setLoadingActions((prev) => {
            const next = new Set(prev);
            next.delete(resolved.name);
            return next;
          });
        }
      });
    }

    // Execute immediately
    setLoadingActions((prev) => new Set(prev).add(resolved.name));
    try {
      await executeAction({
        action: resolved,
        handler,
        setData: set,
        navigate: props.navigate,
        executeAction: async (name) => {
          const subAction: Action = { name };
          await execute(subAction);
        },
      });
    } finally {
      setLoadingActions((prev) => {
        const next = new Set(prev);
        next.delete(resolved.name);
        return next;
      });
    }
  };

  const confirm = (): void => {
    pendingConfirmation()?.resolve();
  };

  const cancel = (): void => {
    pendingConfirmation()?.reject();
  };

  const value: ActionContextValue = {
    handlers,
    loadingActions,
    pendingConfirmation,
    execute,
    confirm,
    cancel,
    registerHandler,
  };

  return (
    <ActionContext.Provider value={value}>
      {props.children}
    </ActionContext.Provider>
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
 * Hook to execute an action
 */
export function useAction(action: Action): {
  execute: () => Promise<void>;
  isLoading: () => boolean;
} {
  const { execute, loadingActions } = useActions();
  const isLoading = (): boolean => loadingActions().has(action.name);

  const executeAction = (): Promise<void> => execute(action);

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
export function ConfirmDialog(props: ConfirmDialogProps) {
  const isDanger = (): boolean => props.confirm.variant === "danger";

  return (
    <div
      style={{
        position: "fixed",
        inset: "0",
        "background-color": "rgba(0, 0, 0, 0.5)",
        display: "flex",
        "align-items": "center",
        "justify-content": "center",
        "z-index": "50",
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
