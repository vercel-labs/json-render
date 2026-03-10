import { defineComponent, inject, provide, type PropType } from "vue";

/**
 * Repeat scope value provided to child elements inside a repeated element.
 */
export interface RepeatScopeValue {
  /** The current array item object */
  item: unknown;
  /** Index of the current item in the array */
  index: number;
  /** Absolute state path to the current array item (e.g. "/todos/0") — used for statePath two-way binding */
  basePath: string;
}

const REPEAT_SCOPE_KEY = Symbol("json-render:repeat-scope");

/**
 * Provides repeat scope to child elements so $item and $index expressions resolve correctly.
 */
export const RepeatScopeProvider = defineComponent({
  name: "RepeatScopeProvider",
  props: {
    item: {
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
    basePath: {
      type: String as PropType<string>,
      required: true,
    },
  },
  setup(props, { slots }) {
    provide(REPEAT_SCOPE_KEY, props as RepeatScopeValue);
    return () => slots.default?.();
  },
});

/**
 * Read the current repeat scope (or null if not inside a repeated element).
 */
export function useRepeatScope(): RepeatScopeValue | null {
  return (
    inject<RepeatScopeValue>(
      REPEAT_SCOPE_KEY,
      null as unknown as RepeatScopeValue,
    ) ?? null
  );
}
