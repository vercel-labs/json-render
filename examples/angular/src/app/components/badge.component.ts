import { Component, computed, input } from "@angular/core";

@Component({
  selector: "app-badge",
  standalone: true,
  template: `<span class="badge" [style]="style()">{{
    element().props.label
  }}</span>`,
  styles: [
    `
      :host {
        display: block;
      }
      .badge {
        display: inline-block;
        padding: 4px 14px;
        border-radius: 9999px;
        font-size: 13px;
        font-weight: 500;
      }
    `,
  ],
})
export class BadgeComponent {
  readonly element = input.required<{
    props: { label: string; color?: string };
  }>();

  readonly style = computed(() => {
    const color = this.element().props.color ?? "#6b7280";
    return `background-color: ${color}20; color: ${color}; border: 1px solid ${color}40`;
  });
}
