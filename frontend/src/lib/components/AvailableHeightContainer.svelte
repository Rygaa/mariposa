<script lang="ts">
  import { onMount } from "svelte";

  let { children }: { children?: any } = $props();

  let measureRef: HTMLDivElement;
  let availableHeight = $state(0);
  let availableWidth = $state(0);
  let ready = $state(false);

  function calculateHeight() {
    if (measureRef) {
      availableHeight = measureRef.clientHeight;
      availableWidth = measureRef.clientWidth;
      ready = true;
    }
  }

  onMount(() => {
    calculateHeight();

    window.addEventListener("resize", calculateHeight);

    return () => {
      window.removeEventListener("resize", calculateHeight);
    };
  });
</script>

{#if !ready}
  <!-- Measurement div: expands with flex to get available space -->
  <div bind:this={measureRef} class="flex-1 w-full"></div>
{:else}
  <!-- Actual content div: uses measured height -->
  <div
    style="height: {availableHeight}px; width: {availableWidth}px; overflow: auto;"
  >
    {#if children}
      {@render children()}
    {/if}
  </div>
{/if}
