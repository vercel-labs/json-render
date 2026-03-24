<script lang="ts">
  import { untrack } from "svelte";
  import { getBoundProp } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import { getPaginationRange } from "./helpers.js";
  import { Button } from "./ui/button/index.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Pagination">> {}

  let { props, bindings, emit }: Props = $props();

  const pageBound = getBoundProp<number>(
    () => props.page ?? undefined,
    () => bindings?.page,
  );

  let localPage = $state(untrack(() => props.page ?? 1));
  const page = $derived(pageBound.current ?? localPage);
  const totalPages = $derived(props.totalPages ?? 1);
  const pages = $derived(getPaginationRange(page, totalPages));

  function setPage(next: number) {
    if (next < 1 || next > totalPages || next === page) return;
    localPage = next;
    pageBound.current = next;
    emit("change");
  }
</script>

<div class="inline-flex items-center gap-1">
  <Button variant="outline" size="sm" onclick={() => setPage(page - 1)} disabled={page <= 1}>Prev</Button>
  {#each pages as p}
    {#if p === "ellipsis"}
      <span class="px-2 text-sm text-muted-foreground">…</span>
    {:else}
      <Button
        variant={p === page ? "default" : "outline"}
        size="sm"
        onclick={() => setPage(p)}
      >
        {p}
      </Button>
    {/if}
  {/each}
  <Button variant="outline" size="sm" onclick={() => setPage(page + 1)} disabled={page >= totalPages}>Next</Button>
</div>
