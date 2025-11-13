<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		customOnClick?: () => void;
		children?: Snippet;
	}

	let { customOnClick, children, ...restProps }: Props = $props();

	function handleClick(event: MouseEvent) {
		if (customOnClick) {
			customOnClick();
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			if (customOnClick) {
				customOnClick();
			}
		}
	}
</script>

<div {...restProps} onclick={handleClick} onkeydown={handleKeyDown} role="button" tabindex="0">
	{#if children}
		{@render children()}
	{/if}
</div>
