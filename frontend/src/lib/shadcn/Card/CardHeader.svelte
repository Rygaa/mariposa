<script lang="ts">
  import type { Snippet } from 'svelte';
  
  let {
    children,
  }: {
    children?: Snippet;
  } = $props();
</script>

<div class="flex justify-between px-6 py-5 border-b border-gray-200 pb-4 mb-4 items-center" data-shadcn="card-header">
  {#if children}
    {@render children()}
  {/if}
</div>
