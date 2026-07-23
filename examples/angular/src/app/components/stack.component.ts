import { Component, ViewChild, computed, input } from "@angular/core";
import { ChildrenOutletDirective } from "@json-render/angular";

@Component({
  selector: "app-stack",
  standalone: true,
  imports: [ChildrenOutletDirective],
  template: `
    <div [style]="containerStyle()">
      <ng-template jsonRenderChildren></ng-template>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class StackComponent {
  @ViewChild(ChildrenOutletDirective, { static: true })
  childrenOutlet!: ChildrenOutletDirective;

  readonly element = input.required<{
    props: {
      gap?: number;
      padding?: number;
      direction?: "vertical" | "horizontal";
      align?: "start" | "center" | "end";
    };
  }>();

  readonly containerStyle = computed(() => {
    const p = this.element().props;
    return [
      "display: flex",
      `flex-direction: ${p.direction === "horizontal" ? "row" : "column"}`,
      p.gap ? `gap: ${p.gap}px` : "",
      p.padding ? `padding: ${p.padding}px` : "",
      p.align ? `align-items: ${p.align}` : "",
      "flex-wrap: wrap",
    ]
      .filter(Boolean)
      .join("; ");
  });
}
