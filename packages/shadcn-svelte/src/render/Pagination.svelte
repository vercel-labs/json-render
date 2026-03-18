<script lang="ts">
  import { untrack } from "svelte";
  import { getBoundProp } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "../catalog.js";
  import { getPaginationRange } from "./helpers.js";

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
  <button type="button" class="rounded border px-2 py-1 text-sm" onclick={() => setPage(page - 1)} disabled={page <= 1}>Prev</button>
  {#each pages as p}
    {#if p === "ellipsis"}
      <span class="px-2 text-sm text-muted-foreground">…</span>
    {:else}
      <button
        type="button"
        class={`rounded border px-2 py-1 text-sm ${p === page ? "bg-primary text-primary-foreground" : "bg-background"}`}
        onclick={() => setPage(p)}
      >
        {p}
      </button>
    {/if}
  {/each}
  <button type="button" class="rounded border px-2 py-1 text-sm" onclick={() => setPage(page + 1)} disabled={page >= totalPages}>Next</button>
</div>
