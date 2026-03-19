<script lang="ts">
  import ButtonComponent from "../../src/Button.svelte";

  interface Props {
    onPress: () => void;
  }

  let { onPress }: Props = $props();

  function emit(event: string) {
    if (event === "press") onPress();
  }
</script>

<ButtonComponent
  props={{ label: "Submit", variant: "primary", disabled: false }}
  {emit}
  on={() => ({ emit: () => {}, shouldPreventDefault: false, bound: false })}
/>
