import { ErrorHandler } from "@angular/core";
import type {
  ComponentRef,
  EnvironmentInjector,
  Injector,
  Type,
  ViewContainerRef,
} from "@angular/core";

/**
 * Absorbs rendering errors for individual elements so one broken component
 * cannot crash the whole tree.
 */
export class ElementErrorHandler extends ErrorHandler {
  override handleError(error: unknown): void {
    console.error("[json-render] Rendering error in element:", error);
  }
}

/** Everything {@link mountErrorFallback} needs to recover a single slot. */
export interface FallbackMountOptions {
  vcr: ViewContainerRef;
  fallbackComponent: Type<unknown> | null;
  injector: Injector;
  envInjector: EnvironmentInjector;
}

/**
 * Clear the slot and, if a fallback component is configured, mount it in place
 * of the failed element. Returns the fallback ref (or null when none).
 */
export function mountErrorFallback(
  options: FallbackMountOptions,
  error: unknown,
  context: string,
): ComponentRef<unknown> | null {
  console.error(`[json-render] Render error (${context}):`, error);
  options.vcr.clear();
  if (!options.fallbackComponent) {
    return null;
  }
  return options.vcr.createComponent(options.fallbackComponent, {
    injector: options.injector,
    environmentInjector: options.envInjector,
  });
}
