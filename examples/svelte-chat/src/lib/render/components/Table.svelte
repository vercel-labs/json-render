<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import * as Table from "$lib/components/ui/table";
  import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-svelte";

  interface Props extends BaseComponentProps<{
    data: Array<Record<string, unknown>>;
    columns: Array<{ key: string; label: string }>;
    emptyMessage?: string | null;
  }> {}

  let { props }: Props = $props();

  let sortKey = $state<string | null>(null);
  let sortDir = $state<"asc" | "desc">("asc");

  const rawData = $derived(props.data);
  const items = $derived<Array<Record<string, unknown>>>(
    Array.isArray(rawData)
      ? rawData
      : Array.isArray((rawData as Record<string, unknown>)?.data)
        ? ((rawData as Record<string, unknown>).data as Array<Record<string, unknown>>)
        : []
  );

  const sorted = $derived(
    sortKey
      ? [...items].sort((a, b) => {
          const av = a[sortKey!];
          const bv = b[sortKey!];
          if (typeof av === "number" && typeof bv === "number") {
            return sortDir === "asc" ? av - bv : bv - av;
          }
          const as = String(av ?? "");
          const bs = String(bv ?? "");
          return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
        })
      : items
  );

  function handleSort(key: string) {
    if (sortKey === key) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDir = "asc";
    }
  }
</script>

{#if items.length === 0}
  <div class="text-center py-4 text-muted-foreground">
    {props.emptyMessage ?? "No data"}
  </div>
{:else}
  <Table.Root>
    <Table.Header>
      <Table.Row>
        {#each props.columns as col}
          <Table.Head>
            <button
              type="button"
              class="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              onclick={() => handleSort(col.key)}
            >
              {col.label}
              {#if sortKey === col.key}
                {#if sortDir === "asc"}
                  <ArrowUp class="h-3 w-3 text-muted-foreground" />
                {:else}
                  <ArrowDown class="h-3 w-3 text-muted-foreground" />
                {/if}
              {:else}
                <ArrowUpDown class="h-3 w-3 text-muted-foreground" />
              {/if}
            </button>
          </Table.Head>
        {/each}
      </Table.Row>
    </Table.Header>
    <Table.Body>
        {#each sorted as item, i}
        <Table.Row>
          {#each props.columns as col}
            <Table.Cell>{String(item[col.key] ?? "")}</Table.Cell>
          {/each}
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
{/if}
