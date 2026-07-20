import { Directive, computed, inject, type Signal } from "@angular/core";
import type { ActionConfirm } from "@json-render/core";

import { ActionDispatcherService } from "../services/action-dispatcher.service";

/**
 * Headless confirmation-dialog behavior.
 *
 * The library owns the confirm/cancel MECHANISM (it lives on
 * {@link ActionDispatcherService} as `pendingConfirmation()`/`confirm()`/
 * `cancel()`) but ships no styled UI in this directive, so it never forces a
 * design-system dependency. Compose it via `hostDirectives` (or `extends`) and
 * bind to `open()`/`title()`/`message()`/... to render your own dialog.
 *
 * For a ready-made option, use the exported `ConfirmDialog` component, which is
 * built on top of this directive with minimal inline styles.
 *
 * Must be used within the renderer's DI scope (e.g. projected into
 * `<json-render>`'s content).
 *
 * ```ts
 * @Component({
 *   selector: "app-confirm-dialog",
 *   hostDirectives: [JsonRenderConfirmDialogDirective],
 *   template: `@if (confirm.open()) { ...your styled dialog... }`,
 * })
 * export class AppConfirmDialog {
 *   protected readonly confirm = inject(JsonRenderConfirmDialogDirective);
 * }
 * ```
 */
@Directive({
  selector: "[jsonRenderConfirmDialog]",
  standalone: true,
  exportAs: "jsonRenderConfirmDialog",
})
export class JsonRenderConfirmDialogDirective {
  private readonly dispatcher = inject(ActionDispatcherService);

  readonly confirmation: Signal<ActionConfirm | null> = computed(
    () => this.dispatcher.pendingConfirmation()?.action.confirm ?? null,
  );

  readonly open: Signal<boolean> = computed(() => this.confirmation() !== null);

  readonly title: Signal<string> = computed(
    () => this.confirmation()?.title ?? "",
  );
  readonly message: Signal<string> = computed(
    () => this.confirmation()?.message ?? "",
  );
  readonly confirmLabel: Signal<string> = computed(
    () => this.confirmation()?.confirmLabel ?? "Confirm",
  );
  readonly cancelLabel: Signal<string> = computed(
    () => this.confirmation()?.cancelLabel ?? "Cancel",
  );
  readonly variant: Signal<"default" | "danger"> = computed(
    () => this.confirmation()?.variant ?? "default",
  );

  confirm(): void {
    this.dispatcher.confirm();
  }

  cancel(): void {
    this.dispatcher.cancel();
  }

  dismiss(): void {
    if (this.dispatcher.pendingConfirmation()) {
      this.dispatcher.cancel();
    }
  }
}
