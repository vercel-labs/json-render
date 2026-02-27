<script lang="ts">
  import type { BaseComponentProps } from "./catalog-types.js";

  interface Props extends BaseComponentProps<{ label?: string }> {}

  let { props, emit, bindings, loading }: Props = $props();
</script>

<button class="test-button" onclick={() => emit("press")}>
  {props.label ?? "Button"}
</button>
