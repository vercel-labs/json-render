<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import { getBoundProp } from "@json-render/svelte";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import { Label } from "$lib/components/ui/label";

  interface Props extends BaseComponentProps<{
    label?: string | null;
    value?: string | null;
    options: Array<{ value: string; label: string }>;
  }> {}

  let { props, bindings }: Props = $props();

  function valueBinding() {
    return getBoundProp<string>(
      () => (props.value ?? undefined) as string | undefined,
      () => bindings?.value,
    );
  }

  let value = $derived(
    valueBinding().current ?? ""
  );

  function handleChange(newValue: string) {
    valueBinding().current = newValue;
  }
</script>

<div class="flex flex-col gap-2">
  {#if props.label}
    <Label class="text-sm font-medium">{props.label}</Label>
  {/if}
  <RadioGroup.Root value={value} onValueChange={handleChange}>
    {#each props.options ?? [] as opt}
      <div class="flex items-center gap-2">
        <RadioGroup.Item value={opt.value} id="rg-{opt.value}" />
        <Label for="rg-{opt.value}" class="font-normal cursor-pointer">
          {opt.label}
        </Label>
      </div>
    {/each}
  </RadioGroup.Root>
</div>
