<script lang="ts">
  import LinkComponent from "../../src/Link.svelte";
</script>

<LinkComponent
  props={{ label: "Docs", href: "https://example.com", target: "_blank" }}
  emit={() => {}}
  on={() => ({ emit: () => {}, shouldPreventDefault: false, bound: false })}
/>
