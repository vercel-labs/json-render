<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import { getBoundProp } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{
    value?: string;
    placeholder?: string;
  }> {}

  let { props, bindings }: Props = $props();

  let value = getBoundProp<string>(
    () => props.value,
    () => bindings?.value,
  );
</script>

<input
  bind:value={value.current}
  placeholder={props.placeholder ?? ""}
  style="
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #d1d5db;
    font-size: 14px;
    outline: none;
    width: 100%;
    box-sizing: border-box;
  " />
