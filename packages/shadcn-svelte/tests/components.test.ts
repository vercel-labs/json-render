import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import ButtonHarness from "./test-fixtures/ButtonHarness.test.svelte";
import InputStateHarness from "./test-fixtures/InputStateHarness.test.svelte";
import InputValidationHarness from "./test-fixtures/InputValidationHarness.test.svelte";
import DialogHarness from "./test-fixtures/DialogHarness.test.svelte";
import LinkHarness from "./test-fixtures/LinkHarness.test.svelte";

describe("shadcn-svelte component behavior", () => {
  it("emits press for Button", async () => {
    const onPress = vi.fn();
    render(ButtonHarness, { onPress });

    await fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("opens Link in a new tab without exposing the opener", () => {
    render(LinkHarness);

    const link = screen.getByRole("link", { name: "Docs" });
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("writes bound Input value to state path", async () => {
    const onStateChange = vi.fn();
    render(InputStateHarness, { onStateChange });

    const input = screen.getByLabelText("Name");
    await fireEvent.input(input, { target: { value: "Alice" } });

    expect(onStateChange).toHaveBeenCalledWith([
      { path: "/form/name", value: "Alice" },
    ]);
  });

  it("validates Input on blur when validateOn is blur", async () => {
    render(InputValidationHarness);

    const input = screen.getByLabelText("Email");
    await fireEvent.blur(input);

    expect(screen.getByText("Required")).toBeTruthy();
  });

  it("reads and updates openPath for Dialog", async () => {
    const onStateChange = vi.fn();
    render(DialogHarness, { onStateChange });

    expect(screen.getByText("Dialog content")).toBeTruthy();

    const closeButton = screen.getByRole("button", { name: "Close" });
    await fireEvent.click(closeButton);

    expect(onStateChange).toHaveBeenCalledWith([
      { path: "/dialog/open", value: false },
    ]);
  });
});
