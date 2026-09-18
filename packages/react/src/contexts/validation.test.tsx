import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ValidationConfig } from "@json-render/core";
import { StateProvider } from "./state";
import {
  ValidationProvider,
  useFieldValidation,
  useValidation,
} from "./validation";

const requiredConfig: ValidationConfig = {
  checks: [{ type: "required", message: "Name is required" }],
};
const emailConfig: ValidationConfig = {
  checks: [{ type: "email", message: "Invalid email" }],
};

function Field({
  testId,
  config,
}: {
  testId: string;
  config: ValidationConfig;
}) {
  const { errors } = useFieldValidation("/form/name", config);
  return <span data-testid={testId}>{errors[0] ?? ""}</span>;
}

function ValidatingField({
  testId,
  config,
}: {
  testId: string;
  config: ValidationConfig;
}) {
  const { errors, validate } = useFieldValidation("/form/name", config);
  return (
    <>
      <button onClick={validate}>Validate first</button>
      <span data-testid={testId}>{errors[0] ?? ""}</span>
    </>
  );
}

function ValidateButton() {
  const { validateAll } = useValidation();
  return <button onClick={validateAll}>Validate</button>;
}

function ImperativeRegistration({
  onRegister,
}: {
  onRegister: (value: void) => void;
}) {
  const { registerField } = useValidation();
  React.useEffect(() => {
    onRegister(registerField("/form/name", requiredConfig));
  }, [onRegister, registerField]);
  return null;
}

function TestForm({ showFirst }: { showFirst: boolean }) {
  return (
    <StateProvider initialState={{ form: { name: "not-an-email" } }}>
      <ValidationProvider>
        {showFirst && (
          <Field key="first" testId="first" config={requiredConfig} />
        )}
        <Field key="active" testId="active" config={emailConfig} />
        <ValidateButton />
      </ValidationProvider>
    </StateProvider>
  );
}

function LocallyValidatedSharedPathForm({
  showFirst,
  showActive = true,
}: {
  showFirst: boolean;
  showActive?: boolean;
}) {
  return (
    <StateProvider initialState={{ form: { name: "" } }}>
      <ValidationProvider>
        {showFirst && (
          <ValidatingField testId="first" config={requiredConfig} />
        )}
        {showActive && <Field testId="active" config={emailConfig} />}
      </ValidationProvider>
    </StateProvider>
  );
}

describe("ValidationProvider registrations", () => {
  it("preserves the fire-and-forget registerField contract", () => {
    let registrationResult: unknown = "not registered";

    render(
      <StateProvider initialState={{ form: { name: "" } }}>
        <ValidationProvider>
          <ImperativeRegistration
            onRegister={(value) => {
              registrationResult = value;
            }}
          />
        </ValidationProvider>
      </StateProvider>,
    );

    expect(registrationResult).toBeUndefined();
  });

  it("preserves errors when a non-active shared-path registration unmounts", () => {
    const view = render(<TestForm showFirst />);

    fireEvent.click(screen.getByRole("button", { name: "Validate" }));
    expect(screen.getByTestId("first").textContent).toBe("Invalid email");
    expect(screen.getByTestId("active").textContent).toBe("Invalid email");

    view.rerender(<TestForm showFirst={false} />);

    expect(screen.getByTestId("active").textContent).toBe("Invalid email");
  });

  it("clears errors produced by a released shared-path registration", () => {
    const view = render(<LocallyValidatedSharedPathForm showFirst />);

    fireEvent.click(screen.getByRole("button", { name: "Validate first" }));
    expect(screen.getByTestId("first").textContent).toBe("Name is required");
    expect(screen.getByTestId("active").textContent).toBe("Name is required");

    view.rerender(<LocallyValidatedSharedPathForm showFirst={false} />);

    expect(screen.getByTestId("active").textContent).toBe("");
  });

  it("preserves errors owned by the fallback active registration", () => {
    const view = render(<LocallyValidatedSharedPathForm showFirst />);

    fireEvent.click(screen.getByRole("button", { name: "Validate first" }));
    expect(screen.getByTestId("first").textContent).toBe("Name is required");
    expect(screen.getByTestId("active").textContent).toBe("Name is required");

    view.rerender(
      <LocallyValidatedSharedPathForm showFirst showActive={false} />,
    );

    expect(screen.getByTestId("first").textContent).toBe("Name is required");
  });
});
