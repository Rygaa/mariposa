<script lang="ts">
  import type { Snippet } from "svelte";
  import { getContext } from "svelte";
  import AvailableHeightContainer from "../../components/AvailableHeightContainer.svelte";

  interface Props {
    value: string;
    children?: Snippet;
    class?: string;
  }

  let { value, children, class: className = "" }: Props = $props();

  const tabsContext = getContext<{
    getValue: () => string | undefined;
  }>("tabs");

  const isActive = $derived(tabsContext.getValue() === value);
</script>

{#if isActive}
  {@render children?.()}
{/if}
