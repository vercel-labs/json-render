<script lang="ts">
  import { untrack } from "svelte";
  import { getBoundProp, getOptionalValidationContext } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";
  import { createValidation } from "./helpers.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Radio">> {}

  let { props, bindings, emit }: Props = $props();

  let localValue = $state("");
  let errors = $state<string[]>([]);

  const validateOn = $derived((props.validateOn ?? "change") as "change" | "blur" | "submit");
  const validationCtx = getOptionalValidationContext();
  const validation = createValidation(
    validationCtx,
    untrack(() => bindings?.value),
    untrack(() => props.checks ?? null),
  );

  $effect(() => {
    const on = validateOn;
    untrack(() => {
      if (validation.hasValidation) validation.register(on);
    });
  });

  const bound = getBoundProp<string>(
    () => props.value ?? undefined,
    () => bindings?.value,
  );

  const value = $derived(bound.current ?? localValue);

  function choose(next: string) {
    localValue = next;
    bound.current = next;
    if (validateOn === "change") errors = validation.run(validateOn);
    emit("change");
  }
</script>

<div class="space-y-2">
  <span class="text-sm font-medium">{props.label}</span>
  {#each props.options ?? [] as option, i}
    <label class="flex items-center gap-2 text-sm cursor-pointer">
      <input
        type="radio"
        name={props.name}
        value={option}
        checked={value === option}
        oninput={() => choose(option || `option-${i}`)}
      />
      <span>{option}</span>
    </label>
  {/each}
  {#if errors.length > 0}
    <p class="text-sm text-destructive">{errors[0]}</p>
  {/if}
</div>
