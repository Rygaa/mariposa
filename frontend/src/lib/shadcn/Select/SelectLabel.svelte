<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className = '', children }: Props = $props();
</script>

<div class="py-1 px-2 text-sm font-semibold text-gray-900 {className}">
	{@render children?.()}
</div>
