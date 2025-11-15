<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getContext } from 'svelte';

	interface Props {
		value: string;
		disabled?: boolean;
		children?: Snippet;
		class?: string;
	}

	let { 
		value, 
		disabled = false, 
		children,
		class: className = ""
	}: Props = $props();

	const tabsContext = getContext<{
		getValue: () => string | undefined;
		setValue: (value: string) => void;
	}>('tabs');

	const isActive = $derived(tabsContext.getValue() === value);

	function handleClick() {
		if (!disabled) {
			tabsContext.setValue(value);
		}
	}
</script>

<button
	type="button"
	role="tab"
	aria-selected={isActive}
	{disabled}
	onclick={handleClick}
	class="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {isActive ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-600 hover:text-gray-900'} {className}"
>
	{@render children?.()}
</button>
