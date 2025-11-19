<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getContext, onMount, tick } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		children?: Snippet;
		align?: 'start' | 'center' | 'end';
		side?: 'top' | 'bottom' | 'left' | 'right';
		sideOffset?: number;
		alignOffset?: number;
	}

	let {
		children,
		align = 'center',
		side = 'bottom',
		sideOffset = 8,
		alignOffset = 0,
		class: className = '',
		...restProps
	}: Props = $props();

	const popover = getContext<{
		isOpen: () => boolean;
		setOpen: (value: boolean) => void;
		getTriggerRef: () => HTMLElement | null;
	}>('popover');

	let contentElement = $state<HTMLDivElement | null>(null);
	let position = $state({ top: 0, left: 0 });

	function handleBackdropClick() {
		popover.setOpen(false);
	}

	function calculatePosition() {
		const trigger = popover.getTriggerRef();
		if (!trigger || !contentElement) return;

		const triggerRect = trigger.getBoundingClientRect();
		const contentRect = contentElement.getBoundingClientRect();

		let top = 0;
		let left = 0;

		// Calculate position based on side
		switch (side) {
			case 'top':
				top = triggerRect.top - contentRect.height - sideOffset;
				break;
			case 'bottom':
				top = triggerRect.bottom + sideOffset;
				break;
			case 'left':
				left = triggerRect.left - contentRect.width - sideOffset;
				top = triggerRect.top;
				break;
			case 'right':
				left = triggerRect.right + sideOffset;
				top = triggerRect.top;
				break;
		}

		// Calculate alignment
		if (side === 'top' || side === 'bottom') {
			switch (align) {
				case 'start':
					left = triggerRect.left + alignOffset;
					break;
				case 'center':
					left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2 + alignOffset;
					break;
				case 'end':
					left = triggerRect.right - contentRect.width + alignOffset;
					break;
			}
		} else {
			switch (align) {
				case 'start':
					top = triggerRect.top + alignOffset;
					break;
				case 'center':
					top = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2 + alignOffset;
					break;
				case 'end':
					top = triggerRect.bottom - contentRect.height + alignOffset;
					break;
			}
		}

		// Keep popover within viewport
		const margin = 8;
		top = Math.max(margin, Math.min(top, window.innerHeight - contentRect.height - margin));
		left = Math.max(margin, Math.min(left, window.innerWidth - contentRect.width - margin));

		position = { top, left };
	}

	$effect(() => {
		if (popover.isOpen() && contentElement) {
			tick().then(() => {
				calculatePosition();
			});
		}
	});

	onMount(() => {
		const handleResize = () => {
			if (popover.isOpen()) {
				calculatePosition();
			}
		};

		window.addEventListener('resize', handleResize);
		window.addEventListener('scroll', handleResize, true);

		return () => {
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('scroll', handleResize, true);
		};
	});
</script>

{#if popover.isOpen()}
	<!-- Backdrop -->
	<button
		class="fixed inset-0 z-40"
		onclick={handleBackdropClick}
		aria-label="Close popover"
		tabindex="-1"
	></button>

	<!-- Content -->
	<div
		bind:this={contentElement}
		transition:scale={{ duration: 100, start: 0.95 }}
		class="fixed z-50 rounded-md border border-gray-200 bg-white p-4 shadow-md outline-none {className}"
		style="top: {position.top}px; left: {position.left}px;"
		{...restProps}
	>
		{#if children}{@render children()}{/if}
	</div>
{/if}
