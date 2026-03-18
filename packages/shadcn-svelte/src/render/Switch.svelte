<script lang="ts">
  import { untrack } from "svelte";
  import { getBoundProp, getOptionalValidationContext } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";
  import { createValidation } from "./helpers.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Switch">> {}

  let { props, bindings, emit }: Props = $props();

  let localChecked = $state(untrack(() => Boolean(props.checked)));
  let errors = $state<string[]>([]);

  const validateOn = $derived((props.validateOn ?? "change") as "change" | "blur" | "submit");
  const validationCtx = getOptionalValidationContext();
  const validation = createValidation(
    validationCtx,
    untrack(() => bindings?.checked),
    untrack(() => props.checks ?? null),
  );

  $effect(() => {
    const on = validateOn;
    untrack(() => {
      if (validation.hasValidation) validation.register(on);
    });
  });

  const bound = getBoundProp<boolean>(
    () => props.checked ?? undefined,
    () => bindings?.checked,
  );

  const checked = $derived(bound.current ?? localChecked);

  function toggle() {
    const next = !checked;
    localChecked = next;
    bound.current = next;
    if (validateOn === "change") errors = validation.run(validateOn);
    emit("change");
  }
</script>

<div class="space-y-1">
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    class={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${checked ? "bg-primary text-primary-foreground" : "bg-background"}`}
    onclick={toggle}
  >
    <span>{props.label}</span>
    <span>{checked ? "On" : "Off"}</span>
  </button>
  {#if errors.length > 0}
    <p class="text-sm text-destructive">{errors[0]}</p>
  {/if}
</div>
