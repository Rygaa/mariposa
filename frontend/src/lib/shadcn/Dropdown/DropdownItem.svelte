<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    children,
    class: className = "",
    onclick,
  }: {
    children?: Snippet;
    class?: string;
    onclick?: () => void;
  } = $props();
</script>

<button
  type="button"
  class="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100 {className}"
  onclick={onclick}
>
  {#if children}{@render children()}{/if}
</button>
