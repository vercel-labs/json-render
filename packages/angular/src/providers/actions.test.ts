import "../testing/setup";

import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { describe, expect, it } from "vitest";
import { type ActionBinding } from "@json-render/core";
import { ActionProvider, useActions } from "./actions";
import { StateProvider, useStateStore } from "./state";
import { ValidationProvider, useValidation } from "./validation";

@Component({
  selector: "json-render-action-consumer",
  standalone: true,
  template: "",
})
class ActionConsumerComponent {
  readonly actions = useActions();
  readonly state = useStateStore();
  readonly validation = useValidation();

  run(binding: ActionBinding): Promise<void> {
    return this.actions.execute(binding);
  }
}

@Component({
  standalone: true,
  imports: [
    StateProvider,
    ValidationProvider,
    ActionProvider,
    ActionConsumerComponent,
  ],
  template: `
    <json-render-state-provider [initialState]="initialState">
      <json-render-validation-provider>
        <json-render-action-provider [handlers]="handlers">
          <json-render-action-consumer />
        </json-render-action-provider>
      </json-render-validation-provider>
    </json-render-state-provider>
  `,
})
class ActionHostComponent {
  initialState = {
    count: 0,
    todos: ["a"],
    form: {
      email: "",
    },
  };

  customCalls: Array<Record<string, unknown> | undefined> = [];

  readonly handlers = {
    increment: async (params?: Record<string, unknown>) => {
      this.customCalls.push(params);
    },
  };
}

describe("ActionProvider", () => {
  it("executes built-in state actions and custom handlers", async () => {
    await TestBed.configureTestingModule({
      imports: [ActionHostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ActionHostComponent);
    fixture.detectChanges();

    const consumer = fixture.debugElement.query(
      By.directive(ActionConsumerComponent),
    ).componentInstance as ActionConsumerComponent;

    await consumer.run({
      action: "setState",
      params: {
        statePath: "/count",
        value: 2,
      },
    });

    await consumer.run({
      action: "pushState",
      params: {
        statePath: "/todos",
        value: "b",
      },
    });

    await consumer.run({
      action: "removeState",
      params: {
        statePath: "/todos",
        index: 0,
      },
    });

    await consumer.run({
      action: "increment",
      params: {
        amount: 3,
      },
    });

    expect(consumer.state.get("/count")).toBe(2);
    expect(consumer.state.get("/todos")).toEqual(["b"]);
    expect(fixture.componentInstance.customCalls).toEqual([{ amount: 3 }]);
  });
});
