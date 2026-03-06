<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import { Separator } from "$lib/components/ui/separator";

  interface Props extends BaseComponentProps<Record<string, never>> {}

  let {}: Props = $props();
</script>

<Separator />
