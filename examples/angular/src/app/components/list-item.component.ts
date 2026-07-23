import { Component, computed, input } from "@angular/core";

@Component({
  selector: "app-list-item",
  standalone: true,
  template: `
    <div
      class="item"
      [class.item-done]="element().props.completed"
      (click)="emit()('press')"
    >
      <span class="check" [class.check-done]="element().props.completed">
        {{ element().props.completed ? "✓" : "" }}
      </span>
      <span class="title" [class.title-done]="element().props.completed">
        {{ element().props.title }}
      </span>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        cursor: pointer;
        user-select: none;
        background: #fff;
        transition: background 0.15s;
      }
      .item:hover {
        background: #f9fafb;
      }
      .item-done {
        background: #f0fdf4;
      }
      .item-done:hover {
        background: #dcfce7;
      }
      .check {
        width: 22px;
        height: 22px;
        border-radius: 6px;
        border: 2px solid #d1d5db;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        color: #22c55e;
        flex-shrink: 0;
      }
      .check-done {
        border-color: #22c55e;
      }
      .title-done {
        text-decoration: line-through;
        color: #9ca3af;
      }
    `,
  ],
})
export class ListItemComponent {
  readonly element = input.required<{
    props: { title: string; completed?: boolean };
  }>();
  readonly emit = input.required<(event: string) => void>();
}
