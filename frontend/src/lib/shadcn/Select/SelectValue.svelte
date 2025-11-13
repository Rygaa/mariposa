<script lang="ts">
	import { getContext } from 'svelte';

	interface Props {
		placeholder?: string;
		class?: string;
	}

	let { placeholder = 'Select...', class: className = '' }: Props = $props();

	const select = getContext<{
		getValue: () => string | undefined;
	}>('select');
</script>

<span class="block truncate {className}">
	{select.getValue() || placeholder}
</span>
