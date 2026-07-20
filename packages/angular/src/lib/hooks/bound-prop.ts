import { inject } from "@angular/core";

import { SpecStateService } from "../services/spec-state.service";

/** Return type for {@link boundProp} / {@link injectBoundProp}. */
export interface BoundProp<T> {
  value: T | undefined;
  setValue: (value: T) => void;
}

/**
 * Two-way bound prop helper. The Angular equivalent of the baseline renderers'
 * `useBoundProp`. Reads the already-resolved prop value and writes back to the
 * bound state path (no-op if the prop isn't bound).
 *
 * Must be called within an injection context where `SpecStateService` is
 * available (i.e. inside `<json-render>`).
 */
export function boundProp<T>(
  propValue: T | undefined,
  bindingPath: string | undefined,
  stateService: SpecStateService,
): BoundProp<T> {
  return {
    value: propValue,
    setValue: (value: T) => {
      if (bindingPath) {
        stateService.set(bindingPath, value);
      }
    },
  };
}

/**
 * Convenience wrapper around {@link boundProp} that injects `SpecStateService`.
 * Must be called within an injection context.
 *
 * ```ts
 * private createBound = injectBoundProp();
 * get emailBinding() {
 *   return this.createBound(this.props().value, this.bindings()?.value);
 * }
 * ```
 */
export function injectBoundProp(): <T>(
  propValue: T | undefined,
  bindingPath: string | undefined,
) => BoundProp<T> {
  const stateService = inject(SpecStateService);
  return <T>(propValue: T | undefined, bindingPath: string | undefined) =>
    boundProp(propValue, bindingPath, stateService);
}
