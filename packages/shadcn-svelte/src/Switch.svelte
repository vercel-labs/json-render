<script lang="ts">
  import { untrack } from "svelte";
  import { getBoundProp, getOptionalValidationContext } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import { createValidation } from "./helpers.js";
  import { Switch } from "./ui/switch/index.js";
  import { Label } from "./ui/label/index.js";

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

  function handleChange(value: boolean) {
    localChecked = value;
    bound.current = value;
    if (validateOn === "change") errors = validation.run(validateOn);
    emit("change");
  }
</script>

<div class="space-y-1">
  <div class="flex items-center gap-2">
    <Switch id={props.name} {checked} onCheckedChange={handleChange} />
    {#if props.label}
      <Label for={props.name} class="text-sm cursor-pointer">{props.label}</Label>
    {/if}
  </div>
  {#if errors.length > 0}
    <p class="text-sm text-destructive">{errors[0]}</p>
  {/if}
</div>
