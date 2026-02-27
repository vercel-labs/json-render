<script module lang="ts">
  import { getContext } from "svelte";
  import type { ComputedFunction } from "@json-render/core";

  const FUNCTIONS_KEY = Symbol.for("json-render-functions");
  const EMPTY_FUNCTIONS: Record<string, ComputedFunction> = {};

  /**
   * Functions context value
   */
  export interface FunctionsContext {
    /** Named functions for `$computed` expressions */
    functions: Record<string, ComputedFunction>;
  }

  /**
   * Get the functions context from component tree
   */
  export function getFunctions(): Record<string, ComputedFunction> {
    const ctx = getContext<FunctionsContext>(FUNCTIONS_KEY);
    return ctx?.functions ?? EMPTY_FUNCTIONS;
  }
</script>

<script lang="ts">
  import { setContext, type Snippet } from "svelte";

  interface Props {
    functions?: Record<string, ComputedFunction>;
    children?: Snippet;
  }

  let { functions, children }: Props = $props();

  const ctx: FunctionsContext = {
    get functions() {
      return functions ?? EMPTY_FUNCTIONS;
    },
  };

  setContext(FUNCTIONS_KEY, ctx);
</script>

{@render children?.()}
