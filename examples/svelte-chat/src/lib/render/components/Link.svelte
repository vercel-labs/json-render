<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{
    text: string;
    href: string;
  }> {}

  let { props }: Props = $props();
</script>

<a
  href={props.href}
  target="_blank"
  rel="noopener noreferrer"
  class="text-primary underline underline-offset-4 hover:text-primary/80"
>
  {props.text}
</a>
