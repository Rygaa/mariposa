<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setContext } from 'svelte';

	interface Props {
		value?: string | string[];
		onValueChange?: (value: string | string[]) => void;
		disabled?: boolean;
		multiple?: boolean;
		children?: Snippet;
	}

	let { value = $bindable(), onValueChange, disabled = false, multiple = false, children }: Props = $props();

	let isOpen = $state(false);
	let triggerRef = $state<HTMLElement | null>(null);

	setContext('select', {
		getValue: () => value,
		setValue: (newValue: string) => {
			if (multiple) {
				const currentValues = Array.isArray(value) ? value : [];
				const newValues = currentValues.includes(newValue)
					? currentValues.filter(v => v !== newValue)
					: [...currentValues, newValue];
				value = newValues as any;
				onValueChange?.(newValues as any);
			} else {
				value = newValue as any;
				onValueChange?.(newValue as any);
				isOpen = false;
			}
		},
		getIsOpen: () => isOpen,
		setIsOpen: (open: boolean) => {
			if (!disabled) {
				isOpen = open;
			}
		},
		getDisabled: () => disabled,
		getTriggerRef: () => triggerRef,
		setTriggerRef: (ref: HTMLElement | null) => {
			triggerRef = ref;
		},
		isMultiple: () => multiple
	});

	// Handle escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			isOpen = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="relative">
	{@render children?.()}
</div>
