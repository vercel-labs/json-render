import { ChangeDetectionStrategy, Component, inject } from "@angular/core";

import { JsonRenderConfirmDialogDirective } from "./confirm-dialog.directive";

/**
 * Ready-made, minimally-styled confirmation dialog. Drop it inside
 * `<json-render>` and any action with a `confirm` clause will prompt through it,
 * with no wiring required.
 *
 * It composes {@link JsonRenderConfirmDialogDirective} for behavior and ships
 * only inline styles, so it carries no design-system dependency. For full
 * control over markup/styles, use the headless directive directly instead.
 *
 * ```html
 * <json-render [spec]="spec()">
 *   <json-render-confirm-dialog />
 * </json-render>
 * ```
 */
@Component({
  selector: "json-render-confirm-dialog",
  standalone: true,
  hostDirectives: [JsonRenderConfirmDialogDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (confirm.open()) {
      <div class="jr-confirm-backdrop" (click)="confirm.dismiss()">
        <div
          class="jr-confirm-dialog"
          role="alertdialog"
          aria-modal="true"
          [attr.aria-label]="confirm.title()"
          (click)="$event.stopPropagation()"
        >
          <h2 class="jr-confirm-title">{{ confirm.title() }}</h2>
          <p class="jr-confirm-message">{{ confirm.message() }}</p>
          <div class="jr-confirm-actions">
            <button
              type="button"
              class="jr-confirm-cancel"
              (click)="confirm.cancel()"
            >
              {{ confirm.cancelLabel() }}
            </button>
            <button
              type="button"
              class="jr-confirm-ok"
              [class.jr-confirm-ok--danger]="confirm.variant() === 'danger'"
              (click)="confirm.confirm()"
            >
              {{ confirm.confirmLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .jr-confirm-backdrop {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.4);
        z-index: 1000;
      }
      .jr-confirm-dialog {
        background: #fff;
        color: #111;
        border-radius: 8px;
        padding: 20px 24px;
        width: min(90vw, 400px);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        font-family:
          system-ui,
          -apple-system,
          sans-serif;
      }
      .jr-confirm-title {
        margin: 0 0 8px;
        font-size: 16px;
        font-weight: 600;
      }
      .jr-confirm-message {
        margin: 0 0 20px;
        font-size: 14px;
        line-height: 1.5;
        color: #444;
      }
      .jr-confirm-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .jr-confirm-actions button {
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        border: 1px solid transparent;
      }
      .jr-confirm-cancel {
        background: #f2f2f2;
        border-color: #ddd;
        color: #333;
      }
      .jr-confirm-ok {
        background: #2563eb;
        color: #fff;
      }
      .jr-confirm-ok--danger {
        background: #dc2626;
      }
    `,
  ],
})
export class ConfirmDialog {
  protected readonly confirm = inject(JsonRenderConfirmDialogDirective);
}
