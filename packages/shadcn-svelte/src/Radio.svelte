<script lang="ts">
  import { untrack } from "svelte";
  import { getBoundProp, getOptionalValidationContext } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import { createValidation } from "./helpers.js";
  import { RadioGroup, RadioGroupItem } from "./ui/radio-group/index.js";
  import { Label } from "./ui/label/index.js";

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
  {#if props.label}
    <span class="text-sm font-medium">{props.label}</span>
  {/if}
  <RadioGroup {value} onValueChange={choose} name={props.name}>
    {#each props.options ?? [] as option, i}
      {@const id = `${props.name}-${i}`}
      <div class="flex items-center gap-2">
        <RadioGroupItem value={option} {id} />
        <Label for={id} class="text-sm cursor-pointer">{option}</Label>
      </div>
    {/each}
  </RadioGroup>
  {#if errors.length > 0}
    <p class="text-sm text-destructive">{errors[0]}</p>
  {/if}
</div>
