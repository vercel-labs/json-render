<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Avatar">> {}

  let { props }: Props = $props();

  const initials = $derived(
    props.name
      .split(" ")
      .map((part) => part[0] ?? "")
      .slice(0, 2)
      .join("")
      .toUpperCase(),
  );

  const sizeClass = $derived(
    props.size === "sm" ? "size-8 text-xs" : props.size === "lg" ? "size-12 text-base" : "size-10 text-sm",
  );
</script>

<div class={`inline-flex items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground ${sizeClass}`}>
  {#if props.src}
    <img src={props.src} alt={props.name} class="h-full w-full object-cover" />
  {:else}
    <span>{initials}</span>
  {/if}
</div>
