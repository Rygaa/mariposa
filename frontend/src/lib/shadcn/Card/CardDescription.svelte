<script lang="ts">
  import type { Snippet } from 'svelte';
  
  let {
    children,
    class: className = '',
  }: {
    children?: Snippet;
    class?: string;
  } = $props();
</script>

<p class="text-sm text-gray-600 leading-relaxed {className}" data-shadcn="card-description">
  {#if children}
    {@render children()}
  {/if}
</p>
