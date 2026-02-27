<script lang="ts">
  import type { BaseComponentProps } from "./catalog-types.js";

  interface Props extends BaseComponentProps<{ text?: string }> {}

  let { props, emit, bindings, loading }: Props = $props();
</script>

<span class="test-text">{props.text ?? ""}</span>
