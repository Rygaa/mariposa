<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    children,
    class: className = "",
  }: {
    children?: Snippet;
    class?: string;
  } = $props();
</script>

<div class="px-2 py-1.5 text-sm font-semibold {className}">
  {#if children}{@render children()}{/if}
</div>
