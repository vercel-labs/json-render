<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import { getBoundProp } from "@json-render/svelte";
  import * as Select from "$lib/components/ui/select";
  import { Label } from "$lib/components/ui/label";

  interface Props extends BaseComponentProps<{
    label?: string | null;
    value?: string | null;
    placeholder?: string | null;
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

  const selectedOption = $derived(
    props.options?.find(o => o.value === value)
  );

  function handleChange(newValue: string | undefined) {
    if (newValue) {
      valueBinding().current = newValue;
    }
  }
</script>

<div class="flex flex-col gap-2">
  {#if props.label}
    <Label class="text-sm font-medium">{props.label}</Label>
  {/if}
  <Select.Root type="single" value={value} onValueChange={handleChange}>
    <Select.Trigger>
      {#if selectedOption}
        {selectedOption.label}
      {:else}
        <span class="text-muted-foreground">{props.placeholder ?? "Select..."}</span>
      {/if}
    </Select.Trigger>
    <Select.Content>
      {#each props.options ?? [] as opt}
        <Select.Item value={opt.value}>{opt.label}</Select.Item>
      {/each}
    </Select.Content>
  </Select.Root>
</div>
