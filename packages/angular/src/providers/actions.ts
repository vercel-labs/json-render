import { CommonModule } from "@angular/common";
import {
  Component,
  Injectable,
  InjectionToken,
  Input,
  Signal,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  executeAction as executeResolvedAction,
  resolveAction,
  type ActionBinding,
  type ActionConfirm,
  type ActionHandler,
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
  if (value === "$id") return generateUniqueId();

  if (Array.isArray(value)) {
    return value.map((entry) => deepResolveValue(entry, get));
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 1 && typeof obj.$state === "string") {
      return get(obj.$state);
    }
    if (keys.length === 1 && "$id" in obj) {
      return generateUniqueId();
    }
    const resolved: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(obj)) {
      resolved[key] = deepResolveValue(entry, get);
    }
    return resolved;
  }

  return value;
}

export interface PendingConfirmation {
  action: ResolvedAction;
  handler: ActionHandler;
  confirm: () => void;
  cancel: () => void;
}

export interface ActionContextValue {
  handlers: Signal<Record<string, ActionHandler>>;
  loadingActions: Signal<Set<string>>;
  pendingConfirmation: Signal<PendingConfirmation | null>;
  execute: (binding: ActionBinding) => Promise<void>;
  confirm: () => void;
  cancel: () => void;
  registerHandler: (name: string, handler: ActionHandler) => void;
}

export interface ActionProviderProps {
  handlers?: Record<string, ActionHandler>;
  navigate?: (path: string) => void;
}

export const ACTIONS_CONTEXT = new InjectionToken<ActionContextValue>(
  "json-render:actions",
);

@Injectable()
class ActionContextService implements ActionContextValue {
  private readonly state = useStateStore();
  private readonly validation = useOptionalValidation();

  readonly handlers = signal<Record<string, ActionHandler>>({});
  readonly loadingActions = signal<Set<string>>(new Set());
  readonly pendingConfirmation = signal<PendingConfirmation | null>(null);

  private navigate?: (path: string) => void;

  configure({ handlers, navigate }: ActionProviderProps = {}): void {
    this.handlers.set(handlers ?? {});
    this.navigate = navigate;
  }

  registerHandler(name: string, handler: ActionHandler): void {
    this.handlers.update((value) => ({ ...value, [name]: handler }));
  }

  async execute(binding: ActionBinding): Promise<void> {
    const resolved = resolveAction(binding, this.state.getSnapshot());

    if (resolved.action === "setState" && resolved.params) {
      const statePath = resolved.params.statePath as string;
      if (statePath) {
        this.state.set(statePath, resolved.params.value);
      }
      return;
    }

    if (resolved.action === "pushState" && resolved.params) {
      const statePath = resolved.params.statePath as string;
      if (statePath) {
        const rawValue = resolved.params.value;
        const resolvedValue = deepResolveValue(rawValue, this.state.get);
        const current =
          (this.state.get(statePath) as unknown[] | undefined) ?? [];
        this.state.set(statePath, [...current, resolvedValue]);
        const clearStatePath = resolved.params.clearStatePath as
          | string
          | undefined;
        if (clearStatePath) {
          this.state.set(clearStatePath, "");
        }
      }
      return;
    }

    if (resolved.action === "removeState" && resolved.params) {
      const statePath = resolved.params.statePath as string;
      const index = resolved.params.index as number;
      const current =
        (this.state.get(statePath) as unknown[] | undefined) ?? [];
      if (statePath && Number.isInteger(index)) {
        this.state.set(
          statePath,
          current.filter((_value, currentIndex) => currentIndex !== index),
        );
      }
      return;
    }

    if (resolved.action === "validateForm") {
      const validation = this.validation;
      if (!validation) {
        console.warn(
          "validateForm action was dispatched but no ValidationProvider is connected.",
        );
        return;
      }
      const valid = validation.validateAll();
      const errors: Record<string, string[]> = {};
      for (const [path, fieldState] of Object.entries(
        validation.fieldStates(),
      )) {
        if (fieldState.result && !fieldState.result.valid) {
          errors[path] = fieldState.result.errors;
        }
      }
      const statePath =
        (resolved.params?.statePath as string) || "/formValidation";
      this.state.set(statePath, { valid, errors });
      return;
    }

    if (resolved.action === "push" && resolved.params) {
      const screen = resolved.params.screen as string;
      if (screen) {
        const currentScreen = this.state.get("/currentScreen") as
          | string
          | undefined;
        const navStack =
          (this.state.get("/navStack") as string[] | undefined) ?? [];
        this.state.set("/navStack", [...navStack, currentScreen ?? ""]);
        this.state.set("/currentScreen", screen);
      }
      return;
    }

    if (resolved.action === "pop") {
      const navStack =
        (this.state.get("/navStack") as string[] | undefined) ?? [];
      if (navStack.length > 0) {
        const previousScreen = navStack[navStack.length - 1];
        this.state.set("/navStack", navStack.slice(0, -1));
        this.state.set("/currentScreen", previousScreen);
      }
      return;
    }

    const handler = this.handlers()[resolved.action];
    if (!handler) {
      console.warn(`No handler registered for action: ${resolved.action}`);
      return;
    }

    if (resolved.confirm) {
      const confirmed = await this.requestConfirmation(
        resolved.confirm,
        handler,
        resolved,
      );
      if (!confirmed) return;
    }

    await this.runAction(resolved, handler);
  }

  confirm(): void {
    this.pendingConfirmation()?.confirm();
  }

  cancel(): void {
    this.pendingConfirmation()?.cancel();
  }

  private async requestConfirmation(
    confirm: ActionConfirm,
    handler: ActionHandler,
    action: ResolvedAction,
  ): Promise<boolean> {
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      const title = confirm.title?.trim() ?? "";
      const message = confirm.message?.trim() ?? "";
      return window.confirm([title, message].filter(Boolean).join("\n\n"));
    }

    return await new Promise<boolean>((resolve) => {
      this.pendingConfirmation.set({
        action,
        handler,
        confirm: () => {
          this.pendingConfirmation.set(null);
          resolve(true);
        },
        cancel: () => {
          this.pendingConfirmation.set(null);
          resolve(false);
        },
      });
    });
  }

  private async runAction(
    resolved: ResolvedAction,
    handler: ActionHandler,
  ): Promise<void> {
    this.loadingActions.update((value) => {
      const next = new Set(value);
      next.add(resolved.action);
      return next;
    });

    try {
      await executeResolvedAction({
        action: resolved,
        handler,
        setState: this.state.set,
        navigate: this.navigate,
        executeAction: async (name) => {
          await this.execute({ action: name });
        },
      });
    } finally {
      this.loadingActions.update((value) => {
        const next = new Set(value);
        next.delete(resolved.action);
        return next;
      });
    }
  }
}

@Component({
  selector: "json-render-action-provider",
  standalone: true,
  template: `<ng-content />`,
  providers: [
    ActionContextService,
    {
      provide: ACTIONS_CONTEXT,
      useExisting: ActionContextService,
    },
  ],
})
export class ActionProvider {
  private readonly ctx = inject(ActionContextService);

  @Input() handlers?: Record<string, ActionHandler>;
  @Input() navigate?: (path: string) => void;

  ngOnInit(): void {
    this.ctx.configure({ handlers: this.handlers, navigate: this.navigate });
  }

  ngOnChanges(): void {
    this.ctx.configure({ handlers: this.handlers, navigate: this.navigate });
  }
}

@Component({
  selector: "json-render-confirm-dialog",
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (pending()) {
      <div class="json-render-confirm-dialog">
        <div class="json-render-confirm-dialog__title">
          {{ pending()!.action.confirm?.title }}
        </div>
        <div class="json-render-confirm-dialog__message">
          {{ pending()!.action.confirm?.message }}
        </div>
        <div class="json-render-confirm-dialog__actions">
          <button type="button" (click)="cancel()">
            {{ pending()!.action.confirm?.cancelLabel || "Cancel" }}
          </button>
          <button type="button" (click)="confirm()">
            {{ pending()!.action.confirm?.confirmLabel || "Continue" }}
          </button>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialog {
  private readonly actions = useActions();
  readonly pending = computed(() => this.actions.pendingConfirmation());

  confirm(): void {
    this.actions.confirm();
  }

  cancel(): void {
    this.actions.cancel();
  }
}

export function useActions(): ActionContextValue {
  return inject(ACTIONS_CONTEXT);
}

export function useAction(binding: ActionBinding): {
  execute: () => Promise<void>;
  isLoading: Signal<boolean>;
} {
  const ctx = useActions();
  return {
    execute: () => ctx.execute(binding),
    isLoading: computed(() => ctx.loadingActions().has(binding.action)),
  };
}
