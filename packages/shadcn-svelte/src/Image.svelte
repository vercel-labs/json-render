<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Image">> {}

  let { props }: Props = $props();
</script>

{#if props.src}
  <img
    src={props.src}
    alt={props.alt}
    width={props.width ?? undefined}
    height={props.height ?? undefined}
    class="max-w-full rounded-md border border-border object-cover"
  />
{:else}
  <div
    class="flex items-center justify-center rounded-md border border-dashed border-border bg-muted text-sm text-muted-foreground"
    style={`width:${props.width ?? 320}px;height:${props.height ?? 180}px`}
  >
    {props.alt}
  </div>
{/if}
