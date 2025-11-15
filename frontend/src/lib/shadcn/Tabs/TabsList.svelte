<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
		class?: string;
	}

	let { children, class: className = "" }: Props = $props();
</script>

<div class="inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 {className}">
	{@render children?.()}
</div>
