<script module lang="ts">
  import { getContext } from "svelte";
  import {
    type VisibilityCondition,
    type VisibilityContext as CoreVisibilityContext,
  } from "@json-render/core";

  const VISIBILITY_KEY = Symbol.for("json-render-visibility");

  /**
   * Visibility context value
   */
  export interface VisibilityContext {
    /** Evaluate a visibility condition */
    isVisible: (condition: VisibilityCondition | undefined) => boolean;
    /** The underlying visibility context (for advanced use) */
    ctx: CoreVisibilityContext;
  }

  export interface CurrentValue<T> {
    readonly current: T;
  }

  /**
   * Get the visibility context from component tree
   */
  export function getVisibilityContext(): VisibilityContext {
    const ctx = getContext<VisibilityContext>(VISIBILITY_KEY);
    if (!ctx) {
      throw new Error(
        "getVisibilityContext must be called within a VisibilityProvider",
      );
    }
    return ctx;
  }

  /**
   * Convenience helper to evaluate visibility from context
   */
  export function isVisible(
    condition: VisibilityCondition | undefined,
  ): CurrentValue<boolean> {
    const context = getVisibilityContext();
    return {
      get current() {
        return context.isVisible(condition);
      },
    };
  }
</script>

<script lang="ts">
  import { setContext as setContextInstance, type Snippet } from "svelte";
  import {
    evaluateVisibility as evaluateVisibilityInstance,
    type VisibilityCondition as VisibilityConditionInstance,
    type VisibilityContext as CoreVisibilityContextInstance,
  } from "@json-render/core";
  import { getStateContext } from "./StateProvider.svelte";

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();
  const stateCtx = getStateContext();

  const ctx = {
    get ctx(): CoreVisibilityContextInstance {
      return { stateModel: stateCtx.state };
    },
    isVisible: (condition: VisibilityConditionInstance | undefined) => {
      return evaluateVisibilityInstance(condition, {
        stateModel: stateCtx.state,
      });
    },
  };

  setContextInstance(VISIBILITY_KEY, ctx);
</script>

{@render children?.()}
