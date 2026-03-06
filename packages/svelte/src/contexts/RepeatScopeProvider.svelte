<script module lang="ts">
  import { getContext, setContext, type Snippet } from "svelte";

  const REPEAT_SCOPE_KEY = Symbol("json-render-repeat-scope");

  /**
   * Repeat scope value provided to child elements inside a repeated element.
   */
  export interface RepeatScopeValue {
    /** The current array item object */
    item: unknown;
    /** Index of the current item in the array */
    index: number;
    /** Absolute state path to the current array item (e.g. "/todos/0") */
    basePath: string;
  }

  /**
   * Get the current repeat scope (or null if not inside a repeated element)
   */
  export function getRepeatScope(): RepeatScopeValue | null {
    return getContext<RepeatScopeValue | null>(REPEAT_SCOPE_KEY) ?? null;
  }
</script>

<script lang="ts">
  interface Props {
    item: unknown;
    index: number;
    basePath: string;
    children: Snippet;
  }

  let { item, index, basePath, children }: Props = $props();

  setContext(REPEAT_SCOPE_KEY, {
    get item() {
      return item;
    },
    get index() {
      return index;
    },
    get basePath() {
      return basePath;
    },
  });
</script>

{@render children()}
