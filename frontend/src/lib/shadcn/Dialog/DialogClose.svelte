<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getContext } from 'svelte';

	interface Props {
		children?: Snippet;
		asChild?: boolean;
		class?: string;
	}

	let { children, asChild = false, class: className = '' }: Props = $props();

	const dialog = getContext<{
		isOpen: () => boolean;
		setOpen: (value: boolean) => void;
	}>('dialog');

	function handleClick() {
		dialog.setOpen(false);
	}
</script>

{#if asChild}
	<div onclick={handleClick} role="button" tabindex="0" onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleClick();
		}
	}}>
		{@render children?.()}
	</div>
{:else}
	<button
		type="button"
		onclick={handleClick}
		class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none {className}"
	>
		<svg
			class="h-4 w-4"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="2"
		>
			<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
		</svg>
		<span class="sr-only">Close</span>
	</button>
{/if}
