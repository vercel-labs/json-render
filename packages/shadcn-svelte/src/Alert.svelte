<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";
  import type { ShadcnProps } from "./catalog.js";
  import { Alert, AlertDescription, AlertTitle } from "./ui/alert/index.js";

  interface Props extends BaseComponentProps<ShadcnProps<"Alert">> {}

  let { props }: Props = $props();

  const variant = $derived(props.type === "error" ? "destructive" : "default");
</script>

<Alert {variant}>
  <AlertTitle>{props.title}</AlertTitle>
  {#if props.message}
    <AlertDescription>{props.message}</AlertDescription>
  {/if}
</Alert>
