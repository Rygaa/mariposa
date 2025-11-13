<script lang="ts">
  import type { Snippet } from 'svelte';
  import AvailableHeightContainer from '../../components/AvailableHeightContainer.svelte';
  
  let {
    children,
    class: className = '',
  }: {
    children?: Snippet;
    class?: string;
  } = $props();
</script>
<AvailableHeightContainer>
<div class="flex w-full h-full {className}" data-shadcn="card-content">
  {#if children}
    {@render children()}
  {/if}
</div>
</AvailableHeightContainer>
