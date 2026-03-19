<script lang="ts">
  import { StateProvider, ValidationProvider } from "@json-render/svelte";
  import InputComponent from "../../src/Input.svelte";
</script>

<StateProvider initialState={{ form: { email: "" } }}>
  <ValidationProvider>
    <InputComponent
      props={{
        label: "Email",
        name: "email",
        type: "email",
        placeholder: null,
        value: "",
        checks: [{ type: "required", message: "Required" }],
        validateOn: "blur",
      }}
      bindings={{ value: "/form/email" }}
      emit={() => {}}
      on={() => ({ emit: () => {}, shouldPreventDefault: false, bound: false })}
    />
  </ValidationProvider>
</StateProvider>
