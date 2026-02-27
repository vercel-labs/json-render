<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{ renderer: string }> {}

  let { props, emit }: Props = $props();
</script>

<div class="json-render-renderer-tabs-wrapper">
  <span class="json-render-renderer-tabs-label">Render</span>
  <div class="json-render-renderer-tabs">
    <button
      type="button"
      onclick={() => emit("pressVue")}
      class={[
        "json-render-renderer-tab",
        props.renderer === "vue" && "json-render-renderer-tab--active",
      ]
        .filter(Boolean)
        .join(" ")}>
      Vue
    </button>
    <button
      type="button"
      onclick={() => emit("pressReact")}
      class={[
        "json-render-renderer-tab",
        props.renderer === "react" && "json-render-renderer-tab--active",
      ]
        .filter(Boolean)
        .join(" ")}>
      React
    </button>
    <button
      type="button"
      onclick={() => emit("pressSvelte")}
      class={[
        "json-render-renderer-tab",
        props.renderer === "svelte" && "json-render-renderer-tab--active",
      ]
        .filter(Boolean)
        .join(" ")}>
      Svelte
    </button>
  </div>
</div>
