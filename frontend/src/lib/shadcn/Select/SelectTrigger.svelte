<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getContext } from 'svelte';

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className = '', children }: Props = $props();

	const select = getContext<{
		getValue: () => string | string[] | undefined;
		setValue: (newValue: string) => void;
		getIsOpen: () => boolean;
		setIsOpen: (value: boolean) => void;
		getDisabled: () => boolean;
		setTriggerRef: (ref: HTMLElement | null) => void;
		isSearchable: () => boolean;
		getSearchText: () => string;
		setSearchText: (text: string) => void;
		getSelectedLabel: (value: string) => string;
		isMultiple: () => boolean;
	}>('select');

	let buttonRef = $state<HTMLButtonElement | null>(null);
	let inputRef = $state<HTMLInputElement | null>(null);

	$effect(() => {
		const ref = buttonRef || inputRef?.parentElement;
		if (ref) {
			select.setTriggerRef(ref as HTMLElement);
		}
	});

	function toggleOpen() {
		if (!select.getDisabled()) {
			select.setIsOpen(!select.getIsOpen());
			if (select.isSearchable() && inputRef) {
				setTimeout(() => inputRef?.focus(), 10);
			}
		}
	}	
	
	function handleKeydown(e: KeyboardEvent) {
		if (!select.isSearchable() && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault();
			toggleOpen();
		}
	}

	function handleClick(e: MouseEvent) {
		if (!select.isSearchable()) {
			e.stopPropagation();
			toggleOpen();
		}
	}

	function handleInputClick(e: MouseEvent) {
		e.stopPropagation();
		if (!select.getIsOpen()) {
			select.setIsOpen(true);
		}
	}

	function handleInputChange(e: Event) {
		const target = e.target as HTMLInputElement;
		select.setSearchText(target.value);
		if (!select.getIsOpen()) {
			select.setIsOpen(true);
		}
	}
</script>

{#if select.isSearchable()}
	{@const selectedValue = select.getValue()}
	{@const hasSelection = !select.isMultiple() && selectedValue && typeof selectedValue === 'string'}
	{@const selectedLabel = hasSelection ? select.getSelectedLabel(selectedValue as string) : ''}
	<div class="relative flex h-auto min-h-[2.5rem] w-full items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-within:outline-none focus-within:ring-2 focus-within:ring-gray-400 focus-within:ring-offset-2 {className}">
		{#if hasSelection && selectedLabel && !select.getSearchText()}
			<div class="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
				<span>{selectedLabel}</span>
				<button
					type="button"
					onclick={(e) => {
						e.stopPropagation();
						select.setValue('');
					}}
					aria-label="Clear selection"
					class="hover:bg-blue-200 rounded-full p-0.5"
				>
					<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
					</svg>
				</button>
			</div>
		{/if}
		<input
			bind:this={inputRef}
			type="text"
			value={select.getSearchText()}
			oninput={handleInputChange}
			onclick={handleInputClick}
			placeholder={hasSelection && !select.getSearchText() ? '' : 'Search...'}
			disabled={select.getDisabled()}
			class="flex-1 bg-transparent outline-none disabled:cursor-not-allowed disabled:opacity-50 min-w-[60px]"
		/>
		<svg
			class="h-4 w-4 opacity-50 flex-shrink-0"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
		</svg>
	</div>
{:else}
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
{/if}
