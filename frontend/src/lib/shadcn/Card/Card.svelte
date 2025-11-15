<script lang="ts">
  import type { Snippet } from "svelte";
  import AvailableHeightContainer from "../../components/AvailableHeightContainer.svelte";

  let {
    children,
    class: className = "",
    useAvailableHeight = true,
  }: {
    children?: Snippet;
    class?: string;
    useAvailableHeight?: boolean;
  } = $props();
</script>

{#if useAvailableHeight}
  <AvailableHeightContainer>
    <div
      class="rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm hover:shadow-md transition-shadow duration-200 w-[calc(100%-2rem)] h-[calc(100%-2rem)] flex flex-col box-border m-4 {className}"
      data-shadcn="card"
    >
      {#if children}
        {@render children()}
      {/if}
    </div>
  </AvailableHeightContainer>
{:else}
  <div
    class="rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col box-border {className}"
    data-shadcn="card"
  >
    {#if children}
      {@render children()}
    {/if}
  </div>
{/if}
