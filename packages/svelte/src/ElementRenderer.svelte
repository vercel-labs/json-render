<script lang="ts">
  import type { Spec, UIElement } from "@json-render/core";
  import {
    resolveElementProps,
    resolveBindings,
    resolveActionParam,
    evaluateVisibility,
    type PropResolutionContext,
  } from "@json-render/core";
  import type { ComponentRegistry, ComponentRenderer } from "./renderer.js";
  import type { EventHandle } from "./catalog-types.js";
  import { getStateContext } from "./contexts/StateProvider.svelte";
  import { getActionContext } from "./contexts/ActionProvider.svelte";
  import { getRepeatScope } from "./contexts/RepeatScopeProvider.svelte";
  import { getFunctions } from "./contexts/FunctionsContextProvider.svelte";
  import RepeatChildren from "./RepeatChildren.svelte";
  import Self from "./ElementRenderer.svelte";

  interface Props {
    element: UIElement;
    spec: Spec;
    registry: ComponentRegistry;
    loading?: boolean;
    fallback?: ComponentRenderer;
  }

  let { element, spec, registry, loading = false, fallback }: Props = $props();

  const stateCtx = getStateContext();
  const actionCtx = getActionContext();
  const repeatScope = getRepeatScope();
  const functions = getFunctions();

  // Build context with repeat scope and $computed functions
  let fullCtx = $derived<PropResolutionContext>(
    repeatScope
      ? {
          stateModel: stateCtx.state,
          repeatItem: repeatScope.item,
          repeatIndex: repeatScope.index,
          repeatBasePath: repeatScope.basePath,
          functions,
        }
      : { stateModel: stateCtx.state, functions },
  );

  // Evaluate visibility
  let isVisible = $derived(
    element.visible === undefined
      ? true
      : evaluateVisibility(element.visible, fullCtx),
  );

  // Resolve props and bindings
  let rawProps = $derived(element.props as Record<string, unknown>);
  let resolvedProps = $derived(resolveElementProps(rawProps, fullCtx));
  let elementBindings = $derived(resolveBindings(rawProps, fullCtx));

  // Create resolved element
  let resolvedElement = $derived(
    resolvedProps !== element.props
      ? { ...element, props: resolvedProps }
      : element,
  );

  // Get the component renderer
  let Component = $derived(registry[resolvedElement.type] ?? fallback);

  // Create emit function
  function emit(eventName: string): void {
    const binding = element.on?.[eventName];
    if (!binding) return;

    const actionBindings = Array.isArray(binding) ? binding : [binding];
    for (const b of actionBindings) {
      if (!b.params) {
        actionCtx.execute(b);
        continue;
      }
      // Resolve all action params
      const resolved: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(b.params)) {
        resolved[key] = resolveActionParam(val, fullCtx);
      }
      actionCtx.execute({ ...b, params: resolved });
    }
  }

  function on(eventName: string): EventHandle {
    const binding = element.on?.[eventName];
    if (!binding) {
      return { emit: () => {}, shouldPreventDefault: false, bound: false };
    }

    const actionBindings = Array.isArray(binding) ? binding : [binding];
    const shouldPreventDefault = actionBindings.some((b) => b.preventDefault);
    return {
      emit: () => emit(eventName),
      shouldPreventDefault,
      bound: true,
    };
  }
</script>

{#if isVisible && Component}
  <svelte:boundary
    onerror={(error) => {
      console.error(
        `[json-render] Rendering error in <${resolvedElement.type}>:`,
        error,
      );
    }}>
    <Component
      element={resolvedElement}
      bindings={elementBindings}
      {loading}
      {on}
      {emit}>
      {#if resolvedElement.repeat}
        <RepeatChildren
          element={resolvedElement}
          {spec}
          {registry}
          {loading}
          {fallback} />
      {:else if resolvedElement.children}
        {#each resolvedElement.children as childKey (childKey)}
          {#if spec.elements[childKey]}
            <Self
              element={spec.elements[childKey]}
              {spec}
              {registry}
              {loading}
              {fallback} />
          {:else if !loading}
            {console.warn(
              `[json-render] Missing element "${childKey}" referenced as child of "${resolvedElement.type}". This element will not render.`,
            )}
          {/if}
        {/each}
      {/if}
    </Component>
    {#snippet failed()}
      <!-- render nothing -->
    {/snippet}
  </svelte:boundary>
{/if}
