<script lang="ts">
  import { getBoundProp } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";
  import { Label } from "../ui/label";
  import { createValidation } from "./helpers.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Radio">> {}

  let { props, bindings, emit }: Props = $props();

  let localValue = $state("");
  let errors = $state<string[]>([]);

  const validateOn = $derived((props.validateOn ?? "change") as "change" | "blur" | "submit");
  const validation = $derived(createValidation(bindings?.value, props.checks ?? null));

  $effect(() => {
    if (validation.hasValidation) validation.register(validateOn);
  });

  function binding() {
    return getBoundProp<string>(
      () => props.value ?? undefined,
      () => bindings?.value,
    );
  }

  const value = $derived(binding().current ?? localValue);

  function choose(next: string) {
    localValue = next;
    binding().current = next;
    if (validateOn === "change") errors = validation.run(validateOn);
    emit("change");
  }
</script>

<div class="space-y-2">
  <Label>{props.label}</Label>
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
