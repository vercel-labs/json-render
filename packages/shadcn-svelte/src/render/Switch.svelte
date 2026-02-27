<script lang="ts">
  import { getBoundProp } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";
  import { createValidation } from "./helpers.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Switch">> {}

  let { props, bindings, emit }: Props = $props();

  let localChecked = $state(Boolean(props.checked));
  let errors = $state<string[]>([]);

  const validateOn = $derived((props.validateOn ?? "change") as "change" | "blur" | "submit");
  const validation = $derived(createValidation(bindings?.checked, props.checks ?? null));

  $effect(() => {
    if (validation.hasValidation) validation.register(validateOn);
  });

  function binding() {
    return getBoundProp<boolean>(
      () => props.checked ?? undefined,
      () => bindings?.checked,
    );
  }

  const checked = $derived(binding().current ?? localChecked);

  function toggle() {
    const next = !checked;
    localChecked = next;
    binding().current = next;
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
