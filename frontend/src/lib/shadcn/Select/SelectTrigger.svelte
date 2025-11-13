<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getContext } from 'svelte';

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className = '', children }: Props = $props();

	const select = getContext<{
		getIsOpen: () => boolean;
		setIsOpen: (value: boolean) => void;
		getDisabled: () => boolean;
		setTriggerRef: (ref: HTMLElement | null) => void;
	}>('select');

	let buttonRef = $state<HTMLButtonElement | null>(null);

	$effect(() => {
		if (buttonRef) {
			select.setTriggerRef(buttonRef);
		}
	});

	function toggleOpen() {
		if (!select.getDisabled()) {
			select.setIsOpen(!select.getIsOpen());
		}
	}	
	
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggleOpen();
		}
	}

	function handleClick(e: MouseEvent) {
		e.stopPropagation();
		toggleOpen();
	}
</script>

<button
	bind:this={buttonRef}
	type="button"
	role="combobox"
	aria-expanded={select.getIsOpen()}
	aria-haspopup="listbox"
	aria-controls="select-content"
	disabled={select.getDisabled()}
	onclick={handleClick}
	onkeydown={handleKeydown}
	class="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {className}"
>
	{@render children?.()}
	<svg
		class="h-4 w-4 opacity-50"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
	</svg>
</button>
