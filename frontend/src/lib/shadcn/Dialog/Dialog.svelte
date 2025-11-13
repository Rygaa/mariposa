<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setContext } from 'svelte';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		children?: Snippet;
	}

	let { open = $bindable(false), onOpenChange, children }: Props = $props();

	setContext('dialog', {
		isOpen: () => open,
		setOpen: (value: boolean) => {
			open = value;
			onOpenChange?.(value);
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

{@render children?.()}
