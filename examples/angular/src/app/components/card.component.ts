import { Component, ViewChild, input } from "@angular/core";
import { ChildrenOutletDirective } from "@json-render/angular";

@Component({
  selector: "app-card",
  standalone: true,
  imports: [ChildrenOutletDirective],
  template: `
    <div class="card">
      @if (element().props.title; as title) {
        <h3 class="card-title">{{ title }}</h3>
      }
      @if (element().props.subtitle; as subtitle) {
        <p class="card-subtitle">{{ subtitle }}</p>
      }
      <div class="card-content">
        <ng-template jsonRenderChildren></ng-template>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .card {
        background: #fff;
        border-radius: 10px;
        border: 1px solid #e5e7eb;
        padding: 20px;
      }
      .card-title {
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 2px;
        color: #111827;
      }
      .card-subtitle {
        font-size: 12px;
        color: #9ca3af;
        margin-bottom: 16px;
        line-height: 1.4;
      }
      .card-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
    `,
  ],
})
export class CardComponent {
  @ViewChild(ChildrenOutletDirective, { static: true })
  childrenOutlet!: ChildrenOutletDirective;

  readonly element = input.required<{
    props: { title?: string; subtitle?: string };
  }>();
}
