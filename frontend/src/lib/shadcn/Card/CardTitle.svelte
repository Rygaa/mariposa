<script lang="ts">
  import type { Snippet } from 'svelte';
  
  let {
    children,
  }: {
    children?: Snippet;
  } = $props();
</script>

<h3 class="text-xl font-bold leading-tight tracking-tight text-gray-900" data-shadcn="card-title">
  {#if children}
    {@render children()}
  {/if}
</h3>
