<script lang="ts">
  import { getBoundProp } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";
  import { Label } from "../ui/label";
  import { createValidation } from "./helpers.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Checkbox">> {}

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

  function handleChange(event: Event) {
    const next = (event.target as HTMLInputElement).checked;
    localChecked = next;
    binding().current = next;
    if (validateOn === "change") errors = validation.run(validateOn);
    emit("change");
  }
</script>

<div class="space-y-1">
  <label class="flex items-center gap-2 text-sm cursor-pointer">
    <input type="checkbox" checked={checked} oninput={handleChange} />
    <span>{props.label}</span>
  </label>
  {#if errors.length > 0}
    <p class="text-sm text-destructive">{errors[0]}</p>
  {/if}
</div>
