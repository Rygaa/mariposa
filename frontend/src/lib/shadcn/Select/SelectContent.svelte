<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getContext, onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className = '', children }: Props = $props();

	const select = getContext<{
		getIsOpen: () => boolean;
		setIsOpen: (value: boolean) => void;
		getTriggerRef: () => HTMLElement | null;
	}>('select');

	let contentElement = $state<HTMLDivElement>();

	function handleClickOutside(e: MouseEvent) {
		if (contentElement && !contentElement.contains(e.target as Node)) {
			select.setIsOpen(false);
		}
	}

	function updatePosition() {
		const triggerElement = select.getTriggerRef();
		if (!triggerElement || !contentElement) return;
		
		const rect = triggerElement.getBoundingClientRect();
		
		contentElement.style.position = 'fixed';
		contentElement.style.left = `${rect.left}px`;
		contentElement.style.width = `${rect.width}px`;
		contentElement.style.top = `${rect.bottom + 4}px`;
	}

	$effect(() => {
		if (select.getIsOpen() && contentElement) {
			// Multiple attempts to ensure positioning
			updatePosition();
			requestAnimationFrame(() => updatePosition());
			setTimeout(() => updatePosition(), 10);
			
			window.addEventListener('scroll', updatePosition, true);
			window.addEventListener('resize', updatePosition);
			
			const timeoutId = setTimeout(() => {
				document.addEventListener('click', handleClickOutside);
			}, 0);
			
			return () => {
				clearTimeout(timeoutId);
				document.removeEventListener('click', handleClickOutside);
				window.removeEventListener('scroll', updatePosition, true);
				window.removeEventListener('resize', updatePosition);
			};
		}
	});
</script>

{#if select.getIsOpen()}
	<div
		bind:this={contentElement}
		transition:scale={{ duration: 100, start: 0.95 }}
		role="listbox"
		id="select-content"
		style="z-index: 99999;"
		class="max-h-60 overflow-auto rounded-md border border-gray-200 bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm {className}"
	>
		{@render children?.()}
	</div>
{/if}
