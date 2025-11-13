<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getContext } from 'svelte';

	interface Props {
		value: string;
		disabled?: boolean;
		class?: string;
		children?: Snippet;
	}

	let { value, disabled = false, class: className = '', children }: Props = $props();

	const select = getContext<{
		getValue: () => string | undefined;
		setValue: (newValue: string) => void;
	}>('select');

	let isSelected = $derived(select.getValue() === value);

	function handleClick() {
		if (!disabled) {
			select.setValue(value);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleClick();
		}
	}
</script>

<div
	role="option"
	aria-selected={isSelected}
	tabindex={disabled ? -1 : 0}
	onclick={handleClick}
	onkeydown={handleKeydown}
	class="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none {isSelected
		? 'bg-gray-50 font-medium'
		: 'font-normal'} {disabled ? 'opacity-50 cursor-not-allowed' : ''} {className}"
>
	{#if children}
		{@render children()}
	{:else}
		<span class="block truncate">{value}</span>
	{/if}

	{#if isSelected}
		<span class="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-600">
			<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
				<path
					fill-rule="evenodd"
					d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
					clip-rule="evenodd"
				/>
			</svg>
		</span>
	{/if}
</div>
