<script lang="ts">
  import { getBoundProp } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";
  import * as Select from "../ui/select";
  import { Label } from "../ui/label";
  import { createValidation } from "./helpers.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Select">> {}

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

  function handleValueChange(next: string | undefined) {
    if (!next) return;
    localValue = next;
    binding().current = next;
    if (validateOn === "change") errors = validation.run(validateOn);
    emit("change");
  }
</script>

<div class="space-y-2">
  <Label>{props.label}</Label>
  <Select.Root type="single" {value} onValueChange={handleValueChange}>
    <Select.Trigger>
      {value || props.placeholder || "Select..."}
    </Select.Trigger>
    <Select.Content>
      {#each props.options ?? [] as option, i}
        <Select.Item value={option || `option-${i}`}>{option}</Select.Item>
      {/each}
    </Select.Content>
  </Select.Root>
  {#if errors.length > 0}
    <p class="text-sm text-destructive">{errors[0]}</p>
  {/if}
</div>
