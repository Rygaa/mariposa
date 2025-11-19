<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getContext, onMount } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		children?: Snippet;
		asChild?: boolean;
	}

	let { children, asChild = false, ...restProps }: Props = $props();

	const popover = getContext<{
		isOpen: () => boolean;
		setOpen: (value: boolean) => void;
		setTriggerRef: (ref: HTMLElement | null) => void;
	}>('popover');

	let triggerElement = $state<HTMLElement | null>(null);

	function togglePopover() {
		popover.setOpen(!popover.isOpen());
	}

	onMount(() => {
		if (triggerElement) {
			popover.setTriggerRef(triggerElement);
		}
	});
</script>

{#if asChild}
	<div 
		bind:this={triggerElement} 
		onclick={togglePopover}
		onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePopover(); }}}
		role="button" 
		tabindex="0"
	>
		{#if children}{@render children()}{/if}
	</div>
{:else}
	<button bind:this={triggerElement} onclick={togglePopover} type="button" {...restProps}>
		{#if children}{@render children()}{/if}
	</button>
{/if}
