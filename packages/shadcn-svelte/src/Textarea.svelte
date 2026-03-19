<script lang="ts">
  import { untrack } from "svelte";
  import { getBoundProp, getOptionalValidationContext } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import { Label } from "./ui/label/index.js";
  import { createValidation } from "./helpers.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Textarea">> {}

  let { props, bindings }: Props = $props();

  let localValue = $state("");
  let errors = $state<string[]>([]);

  const validateOn = $derived((props.validateOn ?? "blur") as "change" | "blur" | "submit");
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

  function handleInput(event: Event) {
    const next = (event.target as HTMLTextAreaElement).value;
    localValue = next;
    bound.current = next;
    if (validateOn === "change") errors = validation.run(validateOn);
  }

  function handleBlur() {
    if (validateOn === "blur") errors = validation.run(validateOn);
  }
</script>

<div class="space-y-2">
  <Label for={props.name}>{props.label}</Label>
  <textarea
    id={props.name}
    name={props.name}
    class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
    placeholder={props.placeholder ?? ""}
    rows={props.rows ?? 3}
    value={value}
    oninput={handleInput}
    onblur={handleBlur}
  ></textarea>
  {#if errors.length > 0}
    <p class="text-sm text-destructive">{errors[0]}</p>
  {/if}
</div>
