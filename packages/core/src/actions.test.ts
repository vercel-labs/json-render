import { describe, it, expect, vi } from "vitest";
import {
  resolveAction,
  executeAction,
  interpolateString,
  actionBinding,
  ActionOnSuccessSchema,
  ActionOnErrorSchema,
} from "./actions";
import { findFormValue } from "./types";

describe("onSuccess/onError schemas", () => {
  it("keeps params on the onSuccess action form", () => {
    const parsed = ActionOnSuccessSchema.parse({
      action: "toast",
      params: { message: "Saved" },
    });
    expect(parsed).toEqual({ action: "toast", params: { message: "Saved" } });
  });

  it("keeps params on the onError action form", () => {
    const parsed = ActionOnErrorSchema.parse({
      action: "toast",
      params: { message: "Failed" },
    });
    expect(parsed).toEqual({ action: "toast", params: { message: "Failed" } });
  });
});

describe("interpolateString", () => {
  it("interpolates ${path} expressions", () => {
    const data = { user: { name: "Alice" }, count: 5 };

    expect(interpolateString("Hello ${/user/name}!", data)).toBe(
      "Hello Alice!",
    );
    expect(interpolateString("${/user/name} has ${/count} items", data)).toBe(
      "Alice has 5 items",
    );
  });

  it("returns string unchanged when no variables", () => {
    expect(interpolateString("No vars here", {})).toBe("No vars here");
  });

  it("replaces missing values with empty string", () => {
    expect(interpolateString("Hello ${/missing}!", {})).toBe("Hello !");
  });

  it("handles multiple occurrences of same variable", () => {
    const data = { name: "Bob" };
    expect(interpolateString("${/name} says ${/name}", data)).toBe(
      "Bob says Bob",
    );
  });
});

describe("resolveAction", () => {
  it("resolves literal params", () => {
    const resolved = resolveAction(
      {
        action: "navigate",
        params: { url: "/home", count: 5 },
      },
      {},
    );

    expect(resolved.action).toBe("navigate");
    expect(resolved.params.url).toBe("/home");
    expect(resolved.params.count).toBe(5);
  });

  it("resolves dynamic $state params", () => {
    const data = { userId: 123, settings: { theme: "dark" } };
    const resolved = resolveAction(
      {
        action: "updateUser",
        params: {
          id: { $state: "/userId" },
          theme: { $state: "/settings/theme" },
        },
      },
      data,
    );

    expect(resolved.params.id).toBe(123);
    expect(resolved.params.theme).toBe("dark");
  });

  it("passes a resolved dotted email to a form action handler", () => {
    const state = { form: { email: "john.doe@example.com" } };
    const resolved = resolveAction(
      {
        action: "createCustomer",
        params: { email: { $state: "/form/email" } },
      },
      state,
    );

    expect(findFormValue("email", resolved.params, state)).toBe(
      "john.doe@example.com",
    );
  });

  it("interpolates confirmation messages", () => {
    const data = { user: { name: "Alice" } };
    const resolved = resolveAction(
      {
        action: "delete",
        confirm: {
          title: "Delete ${/user/name}",
          message: "Are you sure you want to delete ${/user/name}?",
        },
      },
      data,
    );

    expect(resolved.confirm?.title).toBe("Delete Alice");
    expect(resolved.confirm?.message).toBe(
      "Are you sure you want to delete Alice?",
    );
  });

  it("preserves onSuccess and onError handlers", () => {
    const resolved = resolveAction(
      {
        action: "save",
        onSuccess: { navigate: "/success" },
        onError: { set: { error: "$error.message" } },
      },
      {},
    );

    expect(resolved.onSuccess).toEqual({ navigate: "/success" });
    expect(resolved.onError).toEqual({ set: { error: "$error.message" } });
  });
});

describe("executeAction", () => {
  it("calls the handler with resolved params", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);

    await executeAction({
      action: { action: "test", params: { value: 42 } },
      handler,
      setState: vi.fn(),
    });

    expect(handler).toHaveBeenCalledWith({ value: 42 });
  });

  it("handles onSuccess with navigate", async () => {
    const navigate = vi.fn();

    await executeAction({
      action: {
        action: "test",
        params: {},
        onSuccess: { navigate: "/success" },
      },
      handler: vi.fn().mockResolvedValue(undefined),
      setState: vi.fn(),
      navigate,
    });

    expect(navigate).toHaveBeenCalledWith("/success");
  });

  it("handles onSuccess with set", async () => {
    const setState = vi.fn();

    await executeAction({
      action: {
        action: "test",
        params: {},
        onSuccess: { set: { saved: true, message: "Done" } },
      },
      handler: vi.fn().mockResolvedValue(undefined),
      setState,
    });

    expect(setState).toHaveBeenCalledWith("saved", true);
    expect(setState).toHaveBeenCalledWith("message", "Done");
  });

  it("handles onSuccess with action", async () => {
    const executeActionFn = vi.fn();

    await executeAction({
      action: {
        action: "test",
        params: {},
        onSuccess: { action: "followUp" },
      },
      handler: vi.fn().mockResolvedValue(undefined),
      setState: vi.fn(),
      executeAction: executeActionFn,
    });

    expect(executeActionFn).toHaveBeenCalledWith({ action: "followUp" });
  });

  it("handles onSuccess with action and params", async () => {
    const executeActionFn = vi.fn();

    await executeAction({
      action: {
        action: "save",
        params: {},
        onSuccess: { action: "toast", params: { message: "Saved" } },
      },
      handler: vi.fn().mockResolvedValue(undefined),
      setState: vi.fn(),
      executeAction: executeActionFn,
    });

    expect(executeActionFn).toHaveBeenCalledWith({
      action: "toast",
      params: { message: "Saved" },
    });
  });

  it("handles onError with set", async () => {
    const setState = vi.fn();
    const error = new Error("Something went wrong");

    await executeAction({
      action: {
        action: "test",
        params: {},
        onError: { set: { error: "$error.message" } },
      },
      handler: vi.fn().mockRejectedValue(error),
      setState,
    });

    expect(setState).toHaveBeenCalledWith("error", "Something went wrong");
  });

  it("handles onError with action", async () => {
    const executeActionFn = vi.fn();
    const error = new Error("Failed");

    await executeAction({
      action: {
        action: "test",
        params: {},
        onError: { action: "handleError" },
      },
      handler: vi.fn().mockRejectedValue(error),
      setState: vi.fn(),
      executeAction: executeActionFn,
    });

    expect(executeActionFn).toHaveBeenCalledWith({ action: "handleError" });
  });

  it("handles onError with action and params", async () => {
    const executeActionFn = vi.fn();
    const error = new Error("Failed");

    await executeAction({
      action: {
        action: "save",
        params: {},
        onError: { action: "toast", params: { message: "Save failed" } },
      },
      handler: vi.fn().mockRejectedValue(error),
      setState: vi.fn(),
      executeAction: executeActionFn,
    });

    expect(executeActionFn).toHaveBeenCalledWith({
      action: "toast",
      params: { message: "Save failed" },
    });
  });

  it("re-throws error when no onError handler", async () => {
    const error = new Error("Unhandled");

    await expect(
      executeAction({
        action: { action: "test", params: {} },
        handler: vi.fn().mockRejectedValue(error),
        setState: vi.fn(),
      }),
    ).rejects.toThrow("Unhandled");
  });
});

describe("actionBinding helper", () => {
  describe("simple", () => {
    it("creates binding with action only", () => {
      const a = actionBinding.simple("navigate");

      expect(a.action).toBe("navigate");
      expect(a.params).toBeUndefined();
    });

    it("creates binding with params", () => {
      const a = actionBinding.simple("navigate", { url: "/home" });

      expect(a.action).toBe("navigate");
      expect(a.params).toEqual({ url: "/home" });
    });
  });

  describe("withConfirm", () => {
    it("creates binding with confirmation", () => {
      const a = actionBinding.withConfirm("delete", {
        title: "Confirm",
        message: "Are you sure?",
      });

      expect(a.action).toBe("delete");
      expect(a.confirm).toEqual({
        title: "Confirm",
        message: "Are you sure?",
      });
    });

    it("creates binding with confirmation and params", () => {
      const a = actionBinding.withConfirm(
        "delete",
        { title: "Delete", message: "Delete item?" },
        { id: 123 },
      );

      expect(a.action).toBe("delete");
      expect(a.params).toEqual({ id: 123 });
      expect(a.confirm?.title).toBe("Delete");
    });
  });

  describe("withSuccess", () => {
    it("creates binding with navigate success handler", () => {
      const a = actionBinding.withSuccess("save", { navigate: "/success" });

      expect(a.action).toBe("save");
      expect(a.onSuccess).toEqual({ navigate: "/success" });
    });

    it("creates binding with set success handler", () => {
      const a = actionBinding.withSuccess("save", { set: { saved: true } });

      expect(a.onSuccess).toEqual({ set: { saved: true } });
    });

    it("creates binding with success handler and params", () => {
      const a = actionBinding.withSuccess(
        "save",
        { navigate: "/done" },
        { data: "test" },
      );

      expect(a.params).toEqual({ data: "test" });
      expect(a.onSuccess).toEqual({ navigate: "/done" });
    });
  });
});
