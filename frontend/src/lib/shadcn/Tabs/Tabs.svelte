<script lang="ts">
  import type { Snippet } from "svelte";
  import { setContext } from "svelte";

  interface Props {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    children?: Snippet;
    class?: string;
  }

  let {
    value = $bindable(),
    defaultValue = "",
    onValueChange,
    children,
    class: className = "",
  }: Props = $props();

  // Initialize value with defaultValue if not provided
  if (value === undefined && defaultValue) {
    value = defaultValue;
  }

  setContext("tabs", {
    getValue: () => value,
    setValue: (newValue: string) => {
      value = newValue;
      onValueChange?.(newValue);
    },
  });
</script>

{@render children?.()}
