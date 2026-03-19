<script lang="ts">
  import { StateProvider } from "@json-render/svelte";
  import DialogComponent from "../../src/Dialog.svelte";

  interface Props {
    onStateChange: (changes: Array<{ path: string; value: unknown }>) => void;
  }

  let { onStateChange }: Props = $props();
</script>

<StateProvider initialState={{ dialog: { open: true } }} {onStateChange}>
  <DialogComponent
    props={{ title: "Dialog title", description: "Dialog body", openPath: "/dialog/open" }}
    emit={() => {}}
    on={() => ({ emit: () => {}, shouldPreventDefault: false, bound: false })}
  >
    {#snippet children()}
      <div>Dialog content</div>
    {/snippet}
  </DialogComponent>
</StateProvider>
