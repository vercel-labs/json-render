<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import * as Table from "./ui/table/index.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Table">> {}

  let { props }: Props = $props();

  const columns = $derived(props.columns ?? []);
  const rows = $derived((props.rows ?? []).map((row) => row.map((cell) => String(cell))));
</script>

<div class="rounded-md border overflow-hidden">
  <Table.Root>
    {#if props.caption}
      <Table.Caption>{props.caption}</Table.Caption>
    {/if}
    <Table.Header>
      <Table.Row>
        {#each columns as col}
          <Table.Head>{col}</Table.Head>
        {/each}
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {#each rows as row}
        <Table.Row>
          {#each row as cell}
            <Table.Cell>{cell}</Table.Cell>
          {/each}
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
</div>
