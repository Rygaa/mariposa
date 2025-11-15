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

<div class="h-full w-full p-4 flex {className}" data-shadcn="page">
  {#if children}
    {@render children()}
  {/if}
</div>
