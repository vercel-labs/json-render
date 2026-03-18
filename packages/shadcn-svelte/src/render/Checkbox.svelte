<script lang="ts">
  import { untrack } from "svelte";
  import { getBoundProp, getOptionalValidationContext } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";
  import { createValidation } from "./helpers.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Checkbox">> {}

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

  function handleChange(event: Event) {
    const next = (event.target as HTMLInputElement).checked;
    localChecked = next;
    bound.current = next;
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
