<script lang="ts">
  import type { Snippet } from 'svelte';
  
  let {
    children,
  }: {
    children?: Snippet;
  } = $props();
</script>

<div class="flex items-center gap-3 px-6 pb-5 pt-0 border-t border-gray-100" data-shadcn="card-footer">
  {#if children}
    {@render children()}
  {/if}
</div>
