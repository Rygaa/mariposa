<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
		class?: string;
	}

	let { children, class: className = '' }: Props = $props();
</script>

<div class="flex flex-col space-y-1.5 px-6 py-4 border-b border-gray-200 {className}">
	{@render children?.()}
</div>
