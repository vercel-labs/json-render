import "./testing/setup";

import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";
import type { Spec } from "@json-render/core";
import { JSONUIProvider, Renderer } from "./renderer";
import { element, text } from "./vnode";

@Component({
  standalone: true,
  imports: [JSONUIProvider, Renderer],
  template: `
    <json-ui-provider [registry]="registry" [initialState]="state">
      <json-renderer [spec]="spec" [registry]="registry" />
    </json-ui-provider>
  `,
})
class RendererHostComponent {
  state: Record<string, unknown> = {};
  spec: Spec | null = null;

  readonly registry = {
    Stack: ({ children }: { children?: unknown[] }) =>
      element("div", { className: "stack" }, children as never[]),
    Text: ({ props }: { props: Record<string, unknown> }) =>
      element("span", { className: "text" }, [text(String(props.text ?? ""))]),
    Button: ({
      props,
      emit,
    }: {
      props: Record<string, unknown>;
      emit: (event: string) => void;
    }) =>
      element(
        "button",
        {
          type: "button",
          onclick: () => emit("press"),
        },
        [text(String(props.label ?? ""))],
      ),
    Input: ({
      props,
      bindings,
    }: {
      props: Record<string, unknown>;
      bindings?: Record<string, string>;
    }) =>
      element("input", {
        value: String(props.value ?? ""),
        "data-binding": bindings?.value ?? "",
      }),
  };
}

describe("Renderer", () => {
  it("renders events and reacts to state changes", async () => {
    await TestBed.configureTestingModule({
      imports: [RendererHostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(RendererHostComponent);
    fixture.componentInstance.state = { status: "idle" };
    fixture.componentInstance.spec = {
      root: "root",
      state: { status: "idle" },
      elements: {
        root: {
          type: "Stack",
          props: {},
          children: ["status", "button"],
        },
        status: {
          type: "Text",
          props: {
            text: { $state: "/status" },
          },
          children: [],
        },
        button: {
          type: "Button",
          props: {
            label: "Run",
          },
          on: {
            press: {
              action: "setState",
              params: {
                statePath: "/status",
                value: "done",
              },
            },
          },
          children: [],
        },
      },
    };

    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector(".text")?.textContent).toBe("idle");

    root.querySelector("button")?.click();
    fixture.detectChanges();

    expect(root.querySelector(".text")?.textContent).toBe("done");
  });

  it("supports repeat, visibility, and resolved bindings", async () => {
    await TestBed.configureTestingModule({
      imports: [RendererHostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(RendererHostComponent);
    fixture.componentInstance.state = {
      items: [
        { label: "Visible", visible: true },
        { label: "Hidden", visible: false },
      ],
      form: {
        name: "Ada",
      },
    };
    fixture.componentInstance.spec = {
      root: "root",
      state: fixture.componentInstance.state,
      elements: {
        root: {
          type: "Stack",
          props: {},
          children: ["list", "input"],
        },
        list: {
          type: "Stack",
          props: {},
          repeat: {
            statePath: "/items",
          },
          children: ["item"],
        },
        item: {
          type: "Text",
          props: {
            text: { $item: "label" },
          },
          visible: { $item: "visible", eq: true },
          children: [],
        },
        input: {
          type: "Input",
          props: {
            value: { $bindState: "/form/name" },
          },
          children: [],
        },
      },
    };

    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const texts = [...root.querySelectorAll(".text")].map((node) =>
      node.textContent?.trim(),
    );
    expect(texts).toEqual(["Visible"]);

    const input = root.querySelector("input");
    expect(input?.getAttribute("data-binding")).toBe("/form/name");
    expect((input as HTMLInputElement | null)?.value).toBe("Ada");
  });
});
