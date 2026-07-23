import { Component, input } from "@angular/core";
import { injectBoundProp } from "@json-render/angular";

@Component({
  selector: "app-input",
  standalone: true,
  template: `
    <input
      [value]="bound(element().props.value, bindings()?.['value']).value ?? ''"
      [placeholder]="element().props.placeholder ?? ''"
      (input)="onInput($event)"
      (blur)="emit()('blur')"
      class="input"
    />
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .input {
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid #d1d5db;
        font-size: 14px;
        outline: none;
        width: 100%;
      }
      .input:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
      }
    `,
  ],
})
export class InputComponent {
  readonly element = input.required<{
    props: { value?: string; placeholder?: string };
  }>();
  readonly emit = input.required<(event: string) => void>();
  readonly bindings = input<Record<string, string>>();

  readonly bound = injectBoundProp();

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.bound(this.element().props.value, this.bindings()?.["value"]).setValue(
      value,
    );
    this.emit()("change");
  }
}
