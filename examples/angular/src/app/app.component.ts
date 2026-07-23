import { Component, signal } from "@angular/core";
import {
  JsonRendererComponent,
  ConfirmDialog,
  defineRegistry,
  provideJsonRender,
} from "@json-render/angular";
import type { StateChange } from "@json-render/angular";
import type { Spec } from "@json-render/core";

import { catalog } from "./catalog";
import { demoSpec } from "./spec";
import { StackComponent } from "./components/stack.component";
import { CardComponent } from "./components/card.component";
import { TextComponent } from "./components/text.component";
import { ButtonComponent } from "./components/button.component";
import { BadgeComponent } from "./components/badge.component";
import { ListItemComponent } from "./components/list-item.component";
import { InputComponent } from "./components/input.component";
import { StreamingDemoComponent } from "./streaming-demo.component";
import { ExternalStoreDemoComponent } from "./external-store-demo.component";

const { registry, handlers } = defineRegistry(catalog, {
  components: {
    Stack: StackComponent,
    Card: CardComponent,
    Text: TextComponent,
    Button: ButtonComponent,
    Badge: BadgeComponent,
    ListItem: ListItemComponent,
    Input: InputComponent,
  },
  actions: {
    increment: async (_params, setState, state) => {
      const count = (state["count"] as number) ?? 0;
      setState((prev) => ({ ...prev, count: count + 1 }));
    },
    decrement: async (_params, setState, state) => {
      const count = (state["count"] as number) ?? 0;
      setState((prev) => ({ ...prev, count: Math.max(0, count - 1) }));
    },
    toggleItem: async (params, setState, state) => {
      const index = params?.["index"] as number;
      const todos = (
        state["todos"] as Array<{
          id: string;
          title: string;
          status: string;
        }>
      ).map((item, i) =>
        i === index
          ? { ...item, status: item.status === "done" ? "todo" : "done" }
          : item,
      );
      setState((prev) => ({ ...prev, todos }));
    },
    deleteConfirmed: async (_params, setState) => {
      setState((prev) => ({
        ...prev,
        todos: [],
        deleteStatus: "All todos deleted!",
      }));
    },
  },
});

export const appProviders = provideJsonRender({
  registry,
  handlersFactory: handlers,
});

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    JsonRendererComponent,
    ConfirmDialog,
    StreamingDemoComponent,
    ExternalStoreDemoComponent,
  ],
  template: `
    <header class="app-header">
      <h1>&#64;json-render/angular</h1>
      <span class="subtitle">Feature Demo</span>
    </header>

    <main class="app-main">
      <!-- Spec-driven renderer demo -->
      <section class="demo-section">
        <h2 class="section-title">Spec-Driven Rendering</h2>
        <p class="section-desc">
          All UI below is rendered from a JSON spec via &lt;json-render&gt;.
          Features: state binding, visibility, repeat, filtered lists, actions,
          validation, watchers, confirmation dialogs.
        </p>
        <div class="renderer-container">
          <json-render [spec]="spec()" (stateChange)="onStateChange($event)">
            <json-render-confirm-dialog />
          </json-render>
        </div>
      </section>

      <!-- Streaming demo (no backend needed) -->
      <section class="demo-section">
        <h2 class="section-title">Streaming Simulation</h2>
        <p class="section-desc">
          Tests flatToTree, buildSpecFromParts, getTextFromParts, and
          injectJsonRenderMessage with simulated AI SDK message parts.
        </p>
        <app-streaming-demo />
      </section>

      <!-- External state store demo -->
      <section class="demo-section">
        <h2 class="section-title">External State Store</h2>
        <p class="section-desc">
          Tests createStateStore + [store] input for external state management.
        </p>
        <app-external-store-demo />
      </section>

      <!-- State change log -->
      <section class="demo-section">
        <h2 class="section-title">State Change Log</h2>
        <p class="section-desc">
          Every state mutation emits via (stateChange). Latest 10 deltas shown
          below.
        </p>
        <div class="log-container">
          @for (entry of stateLog(); track entry.id) {
            <div class="log-entry">
              <span class="log-path">{{ entry.path }}</span>
              <span class="log-value">{{ entry.display }}</span>
            </div>
          } @empty {
            <div class="log-empty">
              Interact with the UI above to see state changes here.
            </div>
          }
        </div>
      </section>
    </main>

    <footer class="app-footer">
      <div class="feature-checklist">
        <h3>Feature Coverage Checklist</h3>
        <div class="checklist-grid">
          @for (item of checklist; track item.label) {
            <div class="check-item">
              <span
                class="check-icon"
                [class.check-pass]="item.section !== 'n/a'"
              >
                {{ item.section !== "n/a" ? "[x]" : "[ ]" }}
              </span>
              <span>{{ item.label }}</span>
              <span class="check-section">{{ item.section }}</span>
            </div>
          }
        </div>
      </div>
    </footer>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .app-header {
        background: #111827;
        color: #fff;
        padding: 24px 32px;
        display: flex;
        align-items: baseline;
        gap: 16px;
      }
      .app-header h1 {
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      .subtitle {
        font-size: 14px;
        color: #9ca3af;
        font-weight: 400;
      }
      .app-main {
        max-width: 860px;
        margin: 0 auto;
        padding: 32px 24px;
        display: flex;
        flex-direction: column;
        gap: 32px;
      }
      .demo-section {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 24px;
      }
      .section-title {
        font-size: 17px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .section-desc {
        font-size: 13px;
        color: #6b7280;
        margin-bottom: 20px;
        line-height: 1.5;
      }
      .renderer-container {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 20px;
        background: #f9fafb;
      }
      .log-container {
        max-height: 240px;
        overflow-y: auto;
        font-family: "SF Mono", Monaco, "Cascadia Code", monospace;
        font-size: 12px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #f9fafb;
      }
      .log-entry {
        display: flex;
        gap: 12px;
        padding: 6px 12px;
        border-bottom: 1px solid #f3f4f6;
      }
      .log-path {
        color: #2563eb;
        min-width: 140px;
        flex-shrink: 0;
      }
      .log-value {
        color: #374151;
        word-break: break-all;
      }
      .log-empty {
        padding: 16px;
        text-align: center;
        color: #9ca3af;
        font-style: italic;
      }
      .app-footer {
        max-width: 860px;
        margin: 0 auto 48px;
        padding: 0 24px;
      }
      .feature-checklist {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 24px;
      }
      .feature-checklist h3 {
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 16px;
      }
      .checklist-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 6px;
      }
      .check-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        padding: 4px 0;
      }
      .check-icon {
        font-family: monospace;
        color: #9ca3af;
      }
      .check-pass {
        color: #16a34a;
      }
      .check-section {
        margin-left: auto;
        font-size: 11px;
        color: #9ca3af;
      }
    `,
  ],
})
export class AppComponent {
  readonly spec = signal<Spec>(demoSpec);
  readonly stateLog = signal<
    Array<{ id: number; path: string; display: string }>
  >([]);
  private logCounter = 0;

  readonly checklist = [
    { label: "Basic rendering (root + children)", section: "Spec-Driven" },
    { label: "$state read binding", section: "Spec-Driven" },
    { label: "$bindState two-way binding", section: "Spec-Driven" },
    { label: "$template interpolation", section: "Spec-Driven" },
    { label: "$cond dynamic props", section: "Spec-Driven" },
    { label: "repeat with $item / $index", section: "Spec-Driven" },
    { label: "Filtered lists ($item visibility)", section: "Spec-Driven" },
    { label: "visible conditions ($state)", section: "Spec-Driven" },
    { label: "Built-in setState", section: "Spec-Driven" },
    { label: "Built-in pushState", section: "Spec-Driven" },
    { label: "Built-in removeState", section: "Spec-Driven" },
    { label: "Built-in validateForm", section: "Spec-Driven" },
    { label: "Custom actions", section: "Spec-Driven" },
    { label: "Confirmation dialog", section: "Spec-Driven" },
    { label: "State watchers", section: "Spec-Driven" },
    { label: "(stateChange) output", section: "State Log" },
    { label: "ChildrenOutletDirective", section: "Spec-Driven" },
    { label: "injectBoundProp", section: "Spec-Driven" },
    { label: "flatToTree", section: "Streaming" },
    { label: "buildSpecFromParts", section: "Streaming" },
    { label: "getTextFromParts", section: "Streaming" },
    { label: "injectJsonRenderMessage", section: "Streaming" },
    { label: "createStateStore (external)", section: "External Store" },
    { label: "[store] input", section: "External Store" },
    { label: "defineRegistry", section: "Spec-Driven" },
    { label: "provideJsonRender", section: "Spec-Driven" },
    { label: "ConfirmDialog component", section: "Spec-Driven" },
    { label: "JsonRenderConfirmDialogDirective", section: "Spec-Driven" },
  ];

  onStateChange(changes: StateChange[]): void {
    const newEntries = changes.map((c) => ({
      id: ++this.logCounter,
      path: c.path || "/",
      display:
        typeof c.value === "object"
          ? JSON.stringify(c.value).slice(0, 80)
          : String(c.value),
    }));
    this.stateLog.update((prev) => [...newEntries, ...prev].slice(0, 10));
  }
}
