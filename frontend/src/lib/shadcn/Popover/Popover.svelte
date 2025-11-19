<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setContext } from 'svelte';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		children?: Snippet;
	}

	let { open = $bindable(false), onOpenChange, children }: Props = $props();

	let triggerRef = $state<HTMLElement | null>(null);

	setContext('popover', {
		isOpen: () => open,
		setOpen: (value: boolean) => {
			open = value;
			onOpenChange?.(value);
		},
		getTriggerRef: () => triggerRef,
		setTriggerRef: (ref: HTMLElement | null) => {
			triggerRef = ref;
		}
	});

	// Handle escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
			onOpenChange?.(false);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="relative inline-block">
	{#if children}{@render children()}{/if}
</div>
