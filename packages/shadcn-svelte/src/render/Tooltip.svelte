<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Tooltip">> {}

  let { props }: Props = $props();
</script>

<span title={props.content} class="cursor-help text-sm underline decoration-dotted">{props.text}</span>
