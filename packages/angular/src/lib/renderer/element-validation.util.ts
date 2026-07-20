import type {
  UIElement,
  ValidationCheck,
  ValidationConfig,
} from "@json-render/core";

import type { ElementEventBinding } from "./element-event-binding";
import type { ValidationService } from "../services/validation.service";
import type { EventHandle } from "../types/catalog-types";

export interface ElementFieldRegistration {
  path: string;
  config: ValidationConfig;
}

const VALUE_PROP_KEYS = ["value", "checked", "pressed", "selected"] as const;

/**
 * Derive a field registration from an element that declares validation `checks`
 * and is two-way bound. Returns null when the element isn't a validatable field.
 */
export function deriveFieldRegistration(
  element: UIElement,
  bindings: Record<string, string> | undefined,
): ElementFieldRegistration | null {
  if (!bindings) {
    return null;
  }
  const checks = extractChecks(element.props);
  if (!checks) {
    return null;
  }
  const path = pickFieldPath(bindings);
  if (!path) {
    return null;
  }
  const props = element.props as Record<string, unknown>;
  const validateOn = props["validateOn"];
  const config: ValidationConfig = { checks };
  if (
    validateOn === "change" ||
    validateOn === "blur" ||
    validateOn === "submit"
  ) {
    config.validateOn = validateOn;
  }
  return { path, config };
}

function extractChecks(props: unknown): ValidationCheck[] | null {
  if (typeof props !== "object" || props === null) {
    return null;
  }
  const checks = (props as Record<string, unknown>)["checks"];
  if (!Array.isArray(checks) || checks.length === 0) {
    return null;
  }
  return checks as ValidationCheck[];
}

function pickFieldPath(bindings: Record<string, string>): string | undefined {
  for (const key of VALUE_PROP_KEYS) {
    if (bindings[key]) {
      return bindings[key];
    }
  }
  const entries = Object.entries(bindings);
  const firstEntry = entries[0];
  if (entries.length !== 1 || !firstEntry) {
    return undefined;
  }
  const [boundProp, path] = firstEntry;
  // Dev warning: we're guessing the value path from a lone non-standard binding.
  // Author an explicit value/checked/pressed/selected binding to be unambiguous.
  console.warn(
    `[json-render] Field validation is binding to "${path}" inferred from the only binding ` +
      `("${boundProp}"), which is not a known value prop (${VALUE_PROP_KEYS.join(", ")}). ` +
      `Add an explicit value binding to avoid validating the wrong path.`,
  );
  return path;
}

/**
 * Wrap an event binding so blur/change events drive field validation according
 * to the field's `validateOn` mode (default: validate on blur).
 */
export function withFieldValidation(
  binding: ElementEventBinding,
  registration: ElementFieldRegistration,
  validationService: ValidationService,
): ElementEventBinding {
  const { path, config } = registration;
  const validateOnChange = config.validateOn === "change";
  const validateOnBlur =
    config.validateOn === undefined || config.validateOn === "blur";

  const drive = (eventName: string): void => {
    if (eventName === "blur" || eventName === "focusout") {
      validationService.touch(path);
      if (validateOnBlur) {
        validationService.validate(path, config);
      }
    } else if (
      (eventName === "change" || eventName === "input") &&
      validateOnChange
    ) {
      validationService.validate(path, config);
    }
  };

  return {
    emit: (eventName: string): void => {
      drive(eventName);
      binding.emit(eventName);
    },
    on: (eventName: string): EventHandle => {
      const handle = binding.on(eventName);
      return {
        ...handle,
        emit: (): void => {
          drive(eventName);
          handle.emit();
        },
      };
    },
  };
}
