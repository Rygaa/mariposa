<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
		class?: string;
	}

	let { children, class: className = '' }: Props = $props();
</script>

<div class="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-gray-50 {className}">
	{@render children?.()}
</div>
