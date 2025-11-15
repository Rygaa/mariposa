<script lang="ts">
  import type { Snippet } from "svelte";
  import { getContext, onMount } from "svelte";
  import { fade, scale } from "svelte/transition";
  import ClickableDiv from "../ClickableDiv.svelte";

  interface Props {
    children?: Snippet;
    class?: string;
    closeOnBackdrop?: boolean;
  }

  let {
    children,
    class: className = "",
    closeOnBackdrop = true,
  }: Props = $props();

  const dialog = getContext<{
    isOpen: () => boolean;
    setOpen: (value: boolean) => void;
  }>("dialog");

  let modalElement = $state<HTMLDivElement>();
  let previousActiveElement = $state<HTMLElement | null>(null);

  function handleBackdropClick(e: MouseEvent) {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      dialog.setOpen(false);
    }
  }

  onMount(() => {
    return () => {
      if (
        previousActiveElement &&
        document.body.contains(previousActiveElement)
      ) {
        previousActiveElement.focus();
      }
    };
  });

  $effect(() => {
    if (dialog.isOpen() && modalElement) {
      previousActiveElement = document.activeElement as HTMLElement;
      setTimeout(() => {
        if (modalElement) {
          const firstButton = modalElement.querySelector(
            'button:not([tabindex="-1"])'
          ) as HTMLElement;
          if (firstButton) {
            firstButton.focus();
          } else {
            modalElement.focus();
          }
        }
      }, 50);
    }
  });
</script>

{#if dialog.isOpen()}
  <ClickableDiv
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    onclick={handleBackdropClick}
  >
    <div
      transition:fade={{ duration: 200 }}
      class="fixed inset-0 bg-black bg-opacity-50 transition-opacity cursor-default"
    ></div>

    <div
      bind:this={modalElement}
      transition:scale={{ duration: 200, start: 0.95 }}
      class="relative w-full bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh] overflow-auto {className}"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
    >
      {@render children?.()}
    </div>
  </ClickableDiv>
{/if}
