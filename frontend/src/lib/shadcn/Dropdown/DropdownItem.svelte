<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    children,
    class: className = "",
    onclick,
    isDisabled = false,
  }: {
    children?: Snippet;
    class?: string;
    onclick?: () => void;
    isDisabled?: boolean;
  } = $props();
</script>

<button
  type="button"
  class="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors whitespace-nowrap {isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 focus:bg-gray-100'} {className}"
  onclick={isDisabled ? undefined : onclick}
  disabled={isDisabled}
>
  {#if children}{@render children()}{/if}
</button>
