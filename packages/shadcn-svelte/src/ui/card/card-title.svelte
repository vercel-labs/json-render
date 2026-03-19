<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "../../lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div bind:this={ref} data-slot="card-title" class={cn("text-base leading-normal font-medium group-data-[size=sm]/card:text-sm", className)} {...restProps}>
	{@render children?.()}
</div>
