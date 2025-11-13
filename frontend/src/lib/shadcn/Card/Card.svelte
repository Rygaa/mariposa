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
  <div
    class="rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm hover:shadow-md transition-shadow duration-200 w-full h-full flex flex-col  box-border {className}"
    data-shadcn="card"
  >
    {#if children}
      {@render children()}
    {/if}
  </div>

