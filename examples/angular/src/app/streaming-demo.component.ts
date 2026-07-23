import { Component, signal } from "@angular/core";
import {
  JsonRendererComponent,
  flatToTree,
  buildSpecFromParts,
  getTextFromParts,
  injectJsonRenderMessage,
} from "@json-render/angular";
import type { DataPart } from "@json-render/angular";
import type { FlatElement, Spec } from "@json-render/core";
import { SPEC_DATA_PART_TYPE } from "@json-render/core";

/**
 * Demonstrates streaming helpers without a real backend:
 * - flatToTree: converts flat element array to Spec
 * - buildSpecFromParts: replays AI SDK data parts into a Spec
 * - getTextFromParts: extracts text from message parts
 * - injectJsonRenderMessage: reactive signal from parts
 */
@Component({
  selector: "app-streaming-demo",
  standalone: true,
  imports: [JsonRendererComponent],
  template: `
    <div class="streaming-grid">
      <!-- flatToTree -->
      <div class="streaming-panel">
        <h4>flatToTree</h4>
        <p class="helper-desc">
          Converts a flat element list into a renderable Spec
        </p>
        <button class="action-btn" (click)="runFlatToTree()">
          Run flatToTree
        </button>
        @if (flatSpec(); as spec) {
          <div class="mini-renderer">
            <json-render [spec]="spec" />
          </div>
        }
      </div>

      <!-- buildSpecFromParts -->
      <div class="streaming-panel">
        <h4>buildSpecFromParts</h4>
        <p class="helper-desc">Replays AI SDK spec data parts into a Spec</p>
        <button class="action-btn" (click)="runBuildFromParts()">
          Run buildSpecFromParts
        </button>
        @if (partsSpec(); as spec) {
          <div class="mini-renderer">
            <json-render [spec]="spec" />
          </div>
        }
      </div>

      <!-- getTextFromParts -->
      <div class="streaming-panel">
        <h4>getTextFromParts</h4>
        <p class="helper-desc">
          Extracts and joins text content from message parts
        </p>
        <button class="action-btn" (click)="runGetText()">
          Run getTextFromParts
        </button>
        @if (textResult(); as text) {
          <pre class="text-output">{{ text }}</pre>
        }
      </div>

      <!-- injectJsonRenderMessage -->
      <div class="streaming-panel">
        <h4>injectJsonRenderMessage</h4>
        <p class="helper-desc">
          Reactive signal: derives spec + text from parts
        </p>
        <button class="action-btn" (click)="simulateMessageParts()">
          Simulate Message
        </button>
        <div class="msg-result">
          <div>
            hasSpec: <code>{{ message().hasSpec }}</code>
          </div>
          <div>
            text: <code>{{ message().text || "(empty)" }}</code>
          </div>
          @if (message().spec; as spec) {
            <div class="mini-renderer">
              <json-render [spec]="spec" />
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .streaming-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .streaming-panel {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        background: #f9fafb;
      }
      .streaming-panel h4 {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 4px;
        font-family: "SF Mono", Monaco, monospace;
      }
      .helper-desc {
        font-size: 12px;
        color: #6b7280;
        margin-bottom: 12px;
      }
      .action-btn {
        padding: 6px 14px;
        border-radius: 6px;
        border: 1px solid #d1d5db;
        background: #fff;
        font-size: 13px;
        cursor: pointer;
        margin-bottom: 12px;
      }
      .action-btn:hover {
        background: #f3f4f6;
      }
      .mini-renderer {
        border: 1px dashed #d1d5db;
        border-radius: 6px;
        padding: 12px;
        background: #fff;
        margin-top: 8px;
      }
      .text-output {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 12px;
        font-size: 13px;
        white-space: pre-wrap;
        margin-top: 8px;
      }
      .msg-result {
        font-size: 13px;
        margin-top: 8px;
      }
      .msg-result code {
        background: #e5e7eb;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
      }
      .msg-result > div {
        margin-bottom: 4px;
      }
    `,
  ],
})
export class StreamingDemoComponent {
  readonly flatSpec = signal<Spec | null>(null);
  readonly partsSpec = signal<Spec | null>(null);
  readonly textResult = signal<string | null>(null);

  // Simulated AI SDK message parts (signal-driven)
  readonly simulatedParts = signal<DataPart[]>([]);
  readonly message = injectJsonRenderMessage(this.simulatedParts);

  runFlatToTree(): void {
    const flat: FlatElement[] = [
      { key: "root", type: "Stack", props: { gap: 8, direction: "vertical" } },
      {
        key: "title",
        type: "Text",
        props: {
          content: "Built from flat elements",
          size: "lg",
          weight: "bold",
        },
        parentKey: "root",
      },
      {
        key: "badge",
        type: "Badge",
        props: { label: "flatToTree works", color: "#16a34a" },
        parentKey: "root",
      },
    ];
    this.flatSpec.set(flatToTree(flat));
  }

  runBuildFromParts(): void {
    const parts: DataPart[] = [
      {
        type: SPEC_DATA_PART_TYPE,
        data: {
          type: "flat",
          spec: {
            root: "r",
            elements: {
              r: {
                type: "Stack",
                props: { gap: 8, direction: "vertical" },
                children: ["t", "b"],
              },
              t: {
                type: "Text",
                props: {
                  content: "Built from spec data parts",
                  size: "lg",
                  weight: "bold",
                },
              },
              b: {
                type: "Badge",
                props: { label: "buildSpecFromParts works", color: "#2563eb" },
              },
            },
          },
        },
      },
    ];
    this.partsSpec.set(buildSpecFromParts(parts));
  }

  runGetText(): void {
    const parts: DataPart[] = [
      { type: "text", text: "Here is the generated UI." },
      {
        type: SPEC_DATA_PART_TYPE,
        data: { type: "flat", spec: { root: "", elements: {} } },
      },
      {
        type: "text",
        text: "The card component shows a counter with actions.",
      },
      { type: "data", data: { some: "metadata" } },
      {
        type: "text",
        text: "You can interact with the buttons to test state updates.",
      },
    ];
    this.textResult.set(getTextFromParts(parts));
  }

  simulateMessageParts(): void {
    this.simulatedParts.set([
      { type: "text", text: "Here is a generated card:" },
      {
        type: SPEC_DATA_PART_TYPE,
        data: {
          type: "flat",
          spec: {
            root: "card",
            elements: {
              card: {
                type: "Card",
                props: { title: "From injectJsonRenderMessage" },
                children: ["msg"],
              },
              msg: {
                type: "Text",
                props: { content: "Reactive signal updated", color: "#7c3aed" },
              },
            },
          },
        },
      },
    ]);
  }
}
