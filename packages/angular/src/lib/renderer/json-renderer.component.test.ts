import { describe, expect, it } from "vitest";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import type { Spec } from "@json-render/core";

import { JsonRendererComponent } from "./json-renderer.component";
import { provideJsonRender } from "../registry/registry";

@Component({
  selector: "test-text",
  standalone: true,
  template: `<span class="t">{{ element().props.value }}</span>`,
})
class TestTextComponent {
  readonly element = input.required<{ props: { value: string } }>();
}

function render(spec: Spec) {
  TestBed.configureTestingModule({
    imports: [JsonRendererComponent],
    providers: [provideJsonRender({ registry: { Text: TestTextComponent } })],
  });
  const fixture = TestBed.createComponent(JsonRendererComponent);
  fixture.componentRef.setInput("spec", spec);
  fixture.detectChanges();
  return fixture;
}

describe("JsonRendererComponent", () => {
  it("renders the root element and its text", () => {
    const fixture = render({
      root: "r",
      elements: { r: { type: "Text", props: { value: "hello" } } },
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector(".t")?.textContent).toContain("hello");
  });

  it("filters repeat items by an $item visibility condition (B3)", () => {
    const spec: Spec = {
      root: "list",
      elements: {
        list: {
          type: "Text",
          props: {},
          repeat: { statePath: "/tasks", key: "id" },
          visible: { $item: "status", eq: "todo" },
          children: ["row"],
        },
        row: { type: "Text", props: { value: { $item: "title" } } },
      },
      state: {
        tasks: [
          { id: "1", status: "todo", title: "Keep me" },
          { id: "2", status: "done", title: "Filter me" },
          { id: "3", status: "todo", title: "Keep me too" },
        ],
      },
    };
    const fixture = render(spec);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("Keep me");
    expect(text).toContain("Keep me too");
    expect(text).not.toContain("Filter me");
  });

  it("hides an element whose visible condition is false", () => {
    const fixture = render({
      root: "r",
      elements: {
        r: {
          type: "Text",
          props: { value: "secret" },
          visible: { $state: "/show", eq: true },
        },
      },
      state: { show: false },
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector(".t")).toBeNull();
  });
});
