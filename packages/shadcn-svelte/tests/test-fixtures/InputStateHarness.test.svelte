<script lang="ts">
  import { StateProvider } from "@json-render/svelte";
  import InputComponent from "../../src/Input.svelte";

  interface Props {
    onStateChange: (changes: Array<{ path: string; value: unknown }>) => void;
  }

  let { onStateChange }: Props = $props();
</script>

<StateProvider initialState={{ form: { name: "" } }} {onStateChange}>
  <InputComponent
    props={{
      label: "Name",
      name: "name",
      type: "text",
      placeholder: null,
      value: "",
      checks: null,
      validateOn: "blur",
    }}
    bindings={{ value: "/form/name" }}
    emit={() => {}}
    on={() => ({ emit: () => {}, shouldPreventDefault: false, bound: false })}
  />
</StateProvider>
