<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import { Badge } from "./ui/badge/index.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Badge">> {}

  let { props }: Props = $props();
</script>

<Badge variant={props.variant ?? "default"}>{props.text}</Badge>
