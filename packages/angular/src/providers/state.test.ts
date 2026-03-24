import "../testing/setup";

import { Component, computed } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { describe, expect, it } from "vitest";
import { StateProvider, useStateStore, useStateValue } from "./state";

@Component({
  selector: "json-render-state-consumer",
  standalone: true,
  template: `
    <span class="count">{{ count() }}</span>
    <button type="button" (click)="increment()">inc</button>
  `,
})
class StateConsumerComponent {
  readonly store = useStateStore();
  readonly count = useStateValue<number>("/count");

  increment(): void {
    this.store.set("/count", ((this.count() ?? 0) as number) + 1);
  }
}

@Component({
  standalone: true,
  imports: [StateProvider, StateConsumerComponent],
  template: `
    <json-render-state-provider
      [initialState]="initialState"
      [onStateChange]="onStateChange"
    >
      <json-render-state-consumer />
    </json-render-state-provider>
  `,
})
class StateHostComponent {
  initialState = { count: 1 };
  changes: Array<{ path: string; value: unknown }> = [];

  readonly onStateChange = (
    changes: Array<{ path: string; value: unknown }>,
  ) => {
    this.changes = changes;
  };
}

describe("StateProvider", () => {
  it("exposes state and updates consumers reactively", async () => {
    await TestBed.configureTestingModule({
      imports: [StateHostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(StateHostComponent);
    fixture.detectChanges();

    const count = () =>
      fixture.nativeElement.querySelector(".count")?.textContent?.trim();

    expect(count()).toBe("1");

    const consumer = fixture.debugElement.query(
      By.directive(StateConsumerComponent),
    ).componentInstance as StateConsumerComponent;

    consumer.increment();
    fixture.detectChanges();

    expect(count()).toBe("2");
    expect(fixture.componentInstance.changes).toEqual([
      { path: "/count", value: 2 },
    ]);
  });
});
