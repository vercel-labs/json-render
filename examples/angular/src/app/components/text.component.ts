import { Component, computed, input } from "@angular/core";

const sizeMap: Record<string, string> = {
  sm: "12px",
  md: "14px",
  lg: "18px",
  xl: "24px",
};
const weightMap: Record<string, string> = {
  normal: "400",
  medium: "500",
  bold: "700",
};

@Component({
  selector: "app-text",
  standalone: true,
  template: `<span [style]="style()">{{ text() }}</span>`,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class TextComponent {
  readonly element = input.required<{
    props: {
      content: unknown;
      size?: "sm" | "md" | "lg" | "xl";
      weight?: "normal" | "medium" | "bold";
      color?: string;
    };
  }>();

  readonly text = computed(() => {
    const c = this.element().props.content;
    return c == null ? "" : String(c);
  });

  readonly style = computed(() => {
    const p = this.element().props;
    return [
      `font-size: ${sizeMap[p.size ?? "md"]}`,
      `font-weight: ${weightMap[p.weight ?? "normal"]}`,
      p.color ? `color: ${p.color}` : "",
    ]
      .filter(Boolean)
      .join("; ");
  });
}
