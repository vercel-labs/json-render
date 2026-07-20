/**
 * Internal error type. Not part of the public API — the built-in `validateForm`
 * action writes its `{ valid, errors }` result to state (matching the baseline
 * renderers) and does not throw. This type remains only for internal use by
 * consumers who opt into throw-on-invalid semantics via a custom action.
 */
export class FormValidationError extends Error {
  constructor() {
    super("Form validation failed");
    this.name = "FormValidationError";
  }
}
