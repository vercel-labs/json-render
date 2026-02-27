<script lang="ts">
  import ConfirmDialog from "./ConfirmDialog.svelte";
  import { getActionContext } from "./contexts/ActionProvider.svelte";

  const actionCtx = getActionContext();
  let pendingConfirmation = $derived(actionCtx.pendingConfirmation);
</script>

{#if pendingConfirmation?.action.confirm}
  <ConfirmDialog
    confirm={pendingConfirmation.action.confirm}
    onConfirm={actionCtx.confirm}
    onCancel={actionCtx.cancel}
  />
{/if}
