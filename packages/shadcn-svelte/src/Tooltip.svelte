<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "./ui/tooltip/index.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Tooltip">> {}

  let { props }: Props = $props();
</script>

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger class="cursor-help text-sm underline decoration-dotted">
      {props.text}
    </TooltipTrigger>
    <TooltipContent>{props.content}</TooltipContent>
  </Tooltip>
</TooltipProvider>
