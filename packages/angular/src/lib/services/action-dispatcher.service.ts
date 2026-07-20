import { Injectable, inject, signal } from "@angular/core";
import {
  executeAction,
  nextActionDispatchId,
  notifyActionDispatch,
  notifyActionSettle,
  resolveAction,
} from "@json-render/core";
import type {
  ActionBinding,
  ActionHandler,
  ResolvedAction,
} from "@json-render/core";

import { deepResolveValue } from "./deep-resolve-value";
import { SpecStateService } from "./spec-state.service";
import { ValidationService } from "./validation.service";
import {
  JSON_RENDER_ACTION_HANDLERS,
  JSON_RENDER_ACTION_HANDLERS_FACTORY,
  JSON_RENDER_NAVIGATE,
} from "../registry/registry.token";
import type { SetState } from "../types/catalog-types";

const BUILT_IN_ACTIONS = new Set([
  "setState",
  "pushState",
  "removeState",
  "push",
  "pop",
  "validateForm",
]);

export interface PendingConfirmation {
  action: ResolvedAction;
  handler?: ActionHandler;
  resolve: () => void;
  reject: () => void;
}

/**
 * Resolves and executes element `on`/`watch` action bindings. Handles the
 * built-in actions directly (`setState`, `pushState`, `removeState`,
 * `push`/`pop` navigation, `validateForm`) and delegates the rest to registered
 * handlers. Supports confirmation gating, per-action loading signals, and
 * dispatch/settle devtools notifications.
 */
@Injectable()
export class ActionDispatcherService {
  private readonly stateService = inject(SpecStateService);
  private readonly validationService = inject(ValidationService, {
    optional: true,
  });
  private readonly staticHandlers =
    inject(JSON_RENDER_ACTION_HANDLERS, { optional: true }) ?? {};
  private readonly handlersFactory = inject(
    JSON_RENDER_ACTION_HANDLERS_FACTORY,
    { optional: true },
  );
  private readonly navigate = inject(JSON_RENDER_NAVIGATE, { optional: true });

  private readonly handlers: Record<string, ActionHandler> = {
    ...this.staticHandlers,
    ...this.buildFactoryHandlers(),
  };

  readonly loadingActions = signal<Set<string>>(new Set());
  readonly pendingConfirmation = signal<PendingConfirmation | null>(null);

  async execute(binding: ActionBinding): Promise<void> {
    const resolved = resolveAction(binding, this.stateService.state());
    const dispatchId = nextActionDispatchId();
    const startedAt = Date.now();

    notifyActionDispatch({
      id: dispatchId,
      name: resolved.action,
      params: resolved.params,
      at: startedAt,
    });

    if (resolved.confirm) {
      await this.gateConfirmation(resolved, dispatchId, startedAt);
    }

    if (this.isBuiltIn(resolved.action)) {
      this.dispatchBuiltIn(resolved, dispatchId, startedAt);
      return;
    }
    await this.runRegisteredHandler(resolved, dispatchId, startedAt);
  }

  confirm(): void {
    this.pendingConfirmation()?.resolve();
  }

  cancel(): void {
    this.pendingConfirmation()?.reject();
  }

  private async gateConfirmation(
    resolved: ResolvedAction,
    dispatchId: string,
    startedAt: number,
  ): Promise<void> {
    try {
      await this.awaitConfirmation(resolved, this.handlers[resolved.action]);
    } catch (error) {
      this.notifySettle(dispatchId, resolved.action, startedAt, {
        ok: false,
        error,
      });
      throw error;
    }
  }

  private dispatchBuiltIn(
    resolved: ResolvedAction,
    dispatchId: string,
    startedAt: number,
  ): void {
    try {
      this.runBuiltIn(resolved);
    } catch (error) {
      this.notifySettle(dispatchId, resolved.action, startedAt, {
        ok: false,
        error,
      });
      throw error;
    }
    this.notifySettle(dispatchId, resolved.action, startedAt, { ok: true });
  }

  private notifySettle(
    id: string,
    name: string,
    startedAt: number,
    outcome: { ok: boolean; error?: unknown },
  ): void {
    const at = Date.now();
    notifyActionSettle({
      id,
      name,
      ok: outcome.ok,
      at,
      durationMs: at - startedAt,
      error: outcome.error,
    });
  }

  private buildFactoryHandlers(): Record<string, ActionHandler> {
    if (!this.handlersFactory) {
      return {};
    }
    const setState: SetState = (updater) =>
      this.stateService.applyUpdater(updater);
    return this.handlersFactory(
      () => setState,
      () => this.stateService.state(),
    );
  }

  private isBuiltIn(action: string): boolean {
    return BUILT_IN_ACTIONS.has(action);
  }

  private runBuiltIn(resolved: ResolvedAction): void {
    const params = resolved.params ?? {};
    switch (resolved.action) {
      case "setState":
        this.applySetState(params);
        return;
      case "pushState":
        this.applyPushState(params);
        return;
      case "removeState":
        this.applyRemoveState(params);
        return;
      case "push":
        this.applyNavPush(params);
        return;
      case "pop":
        this.applyNavPop();
        return;
      case "validateForm":
        this.applyValidateForm(params);
        return;
    }
  }

  /**
   * Run all registered field validations synchronously and write the result to
   * state (default path `/formValidation`), matching the baseline renderers.
   * Does not throw — the next action in a sequential chain can read the result.
   */
  private applyValidateForm(params: Record<string, unknown>): void {
    if (!this.validationService) {
      console.warn(
        "[json-render] validateForm action was dispatched but no validation " +
          "store is connected. Ensure the renderer's providers are present.",
      );
      return;
    }
    const valid = this.validationService.validateAll();
    const errors = this.validationService.collectErrors();
    const statePath = (params["statePath"] as string) || "/formValidation";
    this.stateService.set(statePath, { valid, errors });
  }

  private applySetState(params: Record<string, unknown>): void {
    const statePath = params["statePath"] as string | undefined;
    if (statePath) {
      this.stateService.set(statePath, params["value"]);
    }
  }

  private applyPushState(params: Record<string, unknown>): void {
    const statePath = params["statePath"] as string | undefined;
    if (!statePath) return;

    const resolvedValue = deepResolveValue(params["value"], (p) =>
      this.stateService.get(p),
    );
    const arr =
      (this.stateService.get(statePath) as unknown[] | undefined) ?? [];
    this.stateService.set(statePath, [...arr, resolvedValue]);

    const clearStatePath = params["clearStatePath"] as string | undefined;
    if (clearStatePath) {
      this.stateService.set(clearStatePath, "");
    }
  }

  private applyRemoveState(params: Record<string, unknown>): void {
    const statePath = params["statePath"] as string | undefined;
    const index = params["index"] as number | undefined;
    if (statePath === undefined || index === undefined) return;

    const arr =
      (this.stateService.get(statePath) as unknown[] | undefined) ?? [];
    this.stateService.set(
      statePath,
      arr.filter((_, i) => i !== index),
    );
  }

  private applyNavPush(params: Record<string, unknown>): void {
    const screen = params["screen"] as string | undefined;
    if (!screen) return;

    const currentScreen = this.stateService.get("/currentScreen") as
      | string
      | undefined;
    const navStack =
      (this.stateService.get("/navStack") as string[] | undefined) ?? [];
    this.stateService.set("/navStack", [...navStack, currentScreen ?? ""]);
    this.stateService.set("/currentScreen", screen);
  }

  private applyNavPop(): void {
    const navStack =
      (this.stateService.get("/navStack") as string[] | undefined) ?? [];
    if (navStack.length === 0) return;

    const previousScreen = navStack[navStack.length - 1];
    this.stateService.set("/navStack", navStack.slice(0, -1));
    this.stateService.set("/currentScreen", previousScreen || undefined);
  }

  private async runRegisteredHandler(
    resolved: ResolvedAction,
    dispatchId: string,
    startedAt: number,
  ): Promise<void> {
    const handler = this.handlers[resolved.action];
    if (!handler) {
      console.warn(`No handler registered for action: ${resolved.action}`);
      this.notifySettle(dispatchId, resolved.action, startedAt, {
        ok: false,
        error: new Error(
          `No handler registered for action: ${resolved.action}`,
        ),
      });
      return;
    }

    await this.executeHandler(resolved, handler, dispatchId, startedAt);
  }

  private awaitConfirmation(
    resolved: ResolvedAction,
    handler?: ActionHandler,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.pendingConfirmation.set({
        action: resolved,
        handler,
        resolve: () => {
          this.pendingConfirmation.set(null);
          resolve();
        },
        reject: () => {
          this.pendingConfirmation.set(null);
          reject(new Error("Action cancelled"));
        },
      });
    });
  }

  private async executeHandler(
    resolved: ResolvedAction,
    handler: ActionHandler,
    dispatchId: string,
    startedAt: number,
  ): Promise<void> {
    this.loadingActions.update((prev) => {
      const next = new Set(prev);
      next.add(resolved.action);
      return next;
    });

    let settleOutcome: { ok: boolean; error?: unknown } = { ok: true };
    try {
      await executeAction({
        action: resolved,
        handler,
        setState: (path: string, value: unknown) =>
          this.stateService.set(path, value),
        navigate: this.navigate ?? undefined,
        executeAction: async (binding) => {
          await this.execute(binding);
        },
      });
    } catch (error) {
      settleOutcome = { ok: false, error };
      throw error;
    } finally {
      this.loadingActions.update((prev) => {
        const next = new Set(prev);
        next.delete(resolved.action);
        return next;
      });
      this.notifySettle(dispatchId, resolved.action, startedAt, settleOutcome);
    }
  }
}
