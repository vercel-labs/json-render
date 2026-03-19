<script lang="ts">
	import { Tooltip as TooltipPrimitive } from "bits-ui";
	import TooltipProvider from "./tooltip-provider.svelte";

	let { open = $bindable(false), ...restProps }: TooltipPrimitive.RootProps = $props();

	const rootProps = $derived({
		...restProps,
		"data-slot": "tooltip",
	} as TooltipPrimitive.RootProps & { "data-slot": string });
</script>

<TooltipProvider>
	<TooltipPrimitive.Root bind:open {...rootProps} />
</TooltipProvider>
