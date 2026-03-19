<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import { Separator } from "./ui/separator/index.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Separator">> {}

  let { props }: Props = $props();
</script>

<Separator
  orientation={props.orientation ?? "horizontal"}
  class={props.orientation === "vertical" ? "h-full mx-2" : "my-3"}
/>
