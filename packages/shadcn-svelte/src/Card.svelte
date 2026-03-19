<script lang="ts">
  import type { Snippet } from "svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import * as Card from "./ui/card/index.js";
  import { cn } from "./lib/utils.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Card">> {
    children?: Snippet;
  }

  let { props, children }: Props = $props();

  const maxWidthClass = $derived(
    props.maxWidth === "sm"
      ? "max-w-xs sm:min-w-[280px]"
      : props.maxWidth === "md"
        ? "max-w-sm sm:min-w-[320px]"
        : props.maxWidth === "lg"
          ? "max-w-md sm:min-w-[360px]"
          : "w-full",
  );
</script>

<Card.Root class={cn(maxWidthClass, props.centered ? "mx-auto" : "") }>
  {#if props.title || props.description}
    <Card.Header>
      {#if props.title}
        <Card.Title>{props.title}</Card.Title>
      {/if}
      {#if props.description}
        <Card.Description>{props.description}</Card.Description>
      {/if}
    </Card.Header>
  {/if}
  <Card.Content class="flex flex-col gap-3">
    {@render children?.()}
  </Card.Content>
</Card.Root>
