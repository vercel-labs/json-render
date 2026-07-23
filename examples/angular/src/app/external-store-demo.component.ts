import { Component, signal } from "@angular/core";
import { JsonRendererComponent, createStateStore } from "@json-render/angular";
import type { StateStore, Spec } from "@json-render/core";

const externalStoreSpec: Spec = {
  root: "root",
  elements: {
    root: {
      type: "Stack",
      props: { gap: 12, direction: "vertical" },
      children: ["label", "controls"],
    },
    label: {
      type: "Text",
      props: {
        content: { $state: "/externalCount" },
        size: "xl",
        weight: "bold",
      },
    },
    controls: {
      type: "Stack",
      props: { gap: 8, direction: "horizontal" },
      children: ["inc-btn", "dec-btn"],
    },
    "inc-btn": {
      type: "Button",
      props: { label: "+1 via spec action", variant: "primary" },
      on: {
        press: {
          action: "setState",
          params: { statePath: "/externalCount", value: 0 },
        },
      },
    },
    "dec-btn": {
      type: "Button",
      props: { label: "Reset via spec action", variant: "secondary" },
      on: {
        press: {
          action: "setState",
          params: { statePath: "/externalCount", value: 0 },
        },
      },
    },
  },
};

/**
 * Demonstrates external state store support:
 * - createStateStore() from @json-render/core
 * - [store] input on <json-render>
 * - External mutations reflected in the renderer
 * - Spec actions write to the external store
 */
@Component({
  selector: "app-external-store-demo",
  standalone: true,
  imports: [JsonRendererComponent],
  template: `
    <div class="store-demo">
      <div class="store-controls">
        <h4>External Store Controls</h4>
        <p class="helper-desc">
          These buttons mutate the store directly (outside the spec). The
          renderer reacts because it's connected via [store].
        </p>
        <div class="btn-row">
          <button class="action-btn" (click)="incrementExternal()">
            +1 (external)
          </button>
          <button class="action-btn" (click)="decrementExternal()">
            -1 (external)
          </button>
          <button class="action-btn" (click)="resetExternal()">
            Reset (external)
          </button>
        </div>
        <div class="store-snapshot">Store snapshot: {{ storeSnapshot() }}</div>
      </div>
      <div class="store-renderer">
        <h4>Renderer (connected via [store])</h4>
        <div class="mini-renderer">
          <json-render [spec]="spec" [store]="store" />
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .store-demo {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .store-controls,
      .store-renderer {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        background: #f9fafb;
      }
      h4 {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .helper-desc {
        font-size: 12px;
        color: #6b7280;
        margin-bottom: 12px;
      }
      .btn-row {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }
      .action-btn {
        padding: 6px 14px;
        border-radius: 6px;
        border: 1px solid #d1d5db;
        background: #fff;
        font-size: 13px;
        cursor: pointer;
      }
      .action-btn:hover {
        background: #f3f4f6;
      }
      .store-snapshot {
        font-family: "SF Mono", Monaco, monospace;
        font-size: 12px;
        color: #6b7280;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 8px 12px;
      }
      .mini-renderer {
        border: 1px dashed #d1d5db;
        border-radius: 6px;
        padding: 12px;
        background: #fff;
        margin-top: 12px;
      }
    `,
  ],
})
export class ExternalStoreDemoComponent {
  readonly store: StateStore = createStateStore({ externalCount: 0 });
  readonly spec = externalStoreSpec;
  readonly storeSnapshot = signal<string>(
    JSON.stringify(this.store.getSnapshot()),
  );

  constructor() {
    this.store.subscribe(() => {
      this.storeSnapshot.set(JSON.stringify(this.store.getSnapshot()));
    });
  }

  incrementExternal(): void {
    const current = (this.store.get("/externalCount") as number) ?? 0;
    this.store.set("/externalCount", current + 1);
  }

  decrementExternal(): void {
    const current = (this.store.get("/externalCount") as number) ?? 0;
    this.store.set("/externalCount", Math.max(0, current - 1));
  }

  resetExternal(): void {
    this.store.set("/externalCount", 0);
  }
}
