import { Component, computed, input } from "@angular/core";

@Component({
  selector: "app-button",
  standalone: true,
  template: `
    <button
      [disabled]="element().props.disabled ?? false"
      [class]="variantClass()"
      (click)="emit()('press')"
    >
      {{ element().props.label }}
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
      button {
        padding: 8px 18px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        border: 1px solid transparent;
        transition:
          background 0.15s,
          opacity 0.15s;
        line-height: 1.4;
      }
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-primary {
        background: #2563eb;
        color: #fff;
        border-color: #2563eb;
      }
      .btn-primary:hover:not(:disabled) {
        background: #1d4ed8;
      }
      .btn-secondary {
        background: #f3f4f6;
        color: #374151;
        border-color: #d1d5db;
      }
      .btn-secondary:hover:not(:disabled) {
        background: #e5e7eb;
      }
      .btn-danger {
        background: #fee2e2;
        color: #dc2626;
        border-color: #fca5a5;
      }
      .btn-danger:hover:not(:disabled) {
        background: #fecaca;
      }
    `,
  ],
})
export class ButtonComponent {
  readonly element = input.required<{
    props: {
      label: string;
      variant?: "primary" | "secondary" | "danger";
      disabled?: boolean;
    };
  }>();
  readonly emit = input.required<(event: string) => void>();

  readonly variantClass = computed(() => {
    const v = this.element().props.variant ?? "primary";
    return `btn-${v}`;
  });
}
