<script lang="ts">
  import type { Snippet } from 'svelte';
  import AvailableHeightContainer from '../../components/AvailableHeightContainer.svelte';
  import { getContext } from 'svelte';
  
  let {
    children,
    class: className = '',
    useAvailableHeight = true,
  }: {
    children?: Snippet;
    class?: string;
    useAvailableHeight?: boolean;
  } = $props();

  // Allow Card parent to override available height behavior via context
  const ctxUseAvailable: boolean | undefined = getContext('shadcn_card_useAvailableHeight');
  const effectiveUseAvailableHeight = ctxUseAvailable === undefined ? useAvailableHeight : ctxUseAvailable;
</script>

{#if effectiveUseAvailableHeight}
  <AvailableHeightContainer>
    <div class="flex w-full h-full {className}" data-shadcn="card-content">
      {#if children}
        {@render children()}
      {/if}
    </div>
  </AvailableHeightContainer>
{:else}
  <div class="flex w-full {className}" data-shadcn="card-content">
    {#if children}
      {@render children()}
    {/if}
  </div>
{/if}
