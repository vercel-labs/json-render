import {
  computed,
  defineComponent,
  inject,
  provide,
  type ComputedRef,
} from "vue";
import {
  evaluateVisibility,
  type VisibilityCondition,
  type VisibilityContext as CoreVisibilityContext,
} from "@json-render/core";
import { useStateStore } from "./state";

/**
 * Visibility context value
 */
export interface VisibilityContextValue {
  /** Evaluate a visibility condition */
  isVisible: (condition: VisibilityCondition | undefined) => boolean;
  /** The underlying visibility context (reactive) */
  ctx: ComputedRef<CoreVisibilityContext>;
}

const VISIBILITY_KEY = Symbol("json-render:visibility");

/**
 * Provider for visibility evaluation
 */
export const VisibilityProvider = defineComponent({
  name: "VisibilityProvider",
  setup(_, { slots }) {
    const { state } = useStateStore();

    const ctx = computed<CoreVisibilityContext>(() => ({
      stateModel: state.value,
    }));

    const isVisible = (condition: VisibilityCondition | undefined): boolean =>
      evaluateVisibility(condition, ctx.value);

    provide<VisibilityContextValue>(VISIBILITY_KEY, { isVisible, ctx });

    return () => slots.default?.();
  },
});

/**
 * Composable to access visibility evaluation
 */
export function useVisibility(): VisibilityContextValue {
  const ctx = inject<VisibilityContextValue>(VISIBILITY_KEY);
  if (!ctx) {
    throw new Error("useVisibility must be used within a VisibilityProvider");
  }
  return ctx;
}

/**
 * Composable to check if a condition is visible. Returns a reactive
 * `ComputedRef<boolean>` so the result updates whenever state changes.
 */
export function useIsVisible(
  condition: VisibilityCondition | undefined,
): ComputedRef<boolean> {
  const { ctx } = useVisibility();
  return computed(() => evaluateVisibility(condition, ctx.value));
}
