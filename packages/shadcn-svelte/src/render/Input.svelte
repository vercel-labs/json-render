<script lang="ts">
  import { getBoundProp } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";
  import { Input } from "../ui/input";
  import { Label } from "../ui/label";
  import { createValidation } from "./helpers.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Input">> {}

  let { props, bindings, emit }: Props = $props();

  let localValue = $state("");
  let errors = $state<string[]>([]);

  const validateOn = $derived((props.validateOn ?? "blur") as "change" | "blur" | "submit");
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

  function handleInput(event: Event) {
    const next = (event.target as HTMLInputElement).value;
    localValue = next;
    binding().current = next;
    if (validateOn === "change") errors = validation.run(validateOn);
  }

  function handleBlur() {
    if (validateOn === "blur") errors = validation.run(validateOn);
    emit("blur");
  }
</script>

<div class="space-y-2">
  <Label for={props.name}>{props.label}</Label>
  <Input
    id={props.name}
    name={props.name}
    type={props.type ?? "text"}
    placeholder={props.placeholder ?? ""}
    {value}
    oninput={handleInput}
    onfocus={() => emit("focus")}
    onblur={handleBlur}
    onkeydown={(e) => {
      if ((e as KeyboardEvent).key === "Enter") emit("submit");
    }}
  />
  {#if errors.length > 0}
    <p class="text-sm text-destructive">{errors[0]}</p>
  {/if}
</div>
