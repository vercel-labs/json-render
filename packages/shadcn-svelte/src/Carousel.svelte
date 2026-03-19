<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
  } from "./ui/carousel/index.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Carousel">> {}

  let { props }: Props = $props();

  const items = $derived(props.items ?? []);
</script>

<div class="relative px-10">
  <Carousel>
    <CarouselContent>
      {#each items as item}
        <CarouselItem class="basis-64">
          <div class="rounded-lg border bg-card p-4">
            {#if item.title}
              <h4 class="font-medium">{item.title}</h4>
            {/if}
            {#if item.description}
              <p class="text-sm text-muted-foreground">{item.description}</p>
            {/if}
          </div>
        </CarouselItem>
      {/each}
    </CarouselContent>
    <CarouselPrevious />
    <CarouselNext />
  </Carousel>
</div>
