<script lang="ts">
  import type { ActionConfirm } from "@json-render/core";

  interface Props {
    confirm: ActionConfirm;
    onConfirm: () => void;
    onCancel: () => void;
  }

  let { confirm, onConfirm, onCancel }: Props = $props();

  let isDanger = $derived(confirm.variant === "danger");
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="overlay"
  onclick={onCancel}
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="dialog" onclick={(e) => e.stopPropagation()}>
    <h3 class="title">{confirm.title}</h3>
    <p class="message">{confirm.message}</p>
    <div class="buttons">
      <button class="cancel-btn" onclick={onCancel}>
        {confirm.cancelLabel ?? "Cancel"}
      </button>
      <button
        class="confirm-btn"
        class:danger={isDanger}
        onclick={onConfirm}
      >
        {confirm.confirmLabel ?? "Confirm"}
      </button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }

  .dialog {
    background-color: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  }

  .title {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
  }

  .message {
    margin: 0 0 24px 0;
    color: #6b7280;
  }

  .buttons {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .cancel-btn {
    padding: 8px 16px;
    border-radius: 6px;
    border: 1px solid #d1d5db;
    background-color: white;
    cursor: pointer;
  }

  .confirm-btn {
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    background-color: #3b82f6;
    color: white;
    cursor: pointer;
  }

  .confirm-btn.danger {
    background-color: #dc2626;
  }
</style>
