<script lang="ts">
	import { getContext } from 'svelte';

	interface Props {
		placeholder?: string;
		class?: string;
	}

	let { placeholder = 'Select...', class: className = '' }: Props = $props();

	const select = getContext<{
		getValue: () => string | string[] | undefined;
		isMultiple: () => boolean;
	}>('select');

	const displayValue = $derived(() => {
		const value = select.getValue();
		if (select.isMultiple()) {
			if (Array.isArray(value) && value.length > 0) {
				return value.length === 1 ? value[0] : `${value.length} selected`;
			}
			return placeholder;
		}
		return value || placeholder;
	});
</script>

<span class="block truncate {className}">
	{displayValue()}
</span>
