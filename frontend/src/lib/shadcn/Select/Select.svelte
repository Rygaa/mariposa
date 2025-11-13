<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setContext } from 'svelte';

	interface Props {
		value?: string;
		onValueChange?: (value: string) => void;
		disabled?: boolean;
		children?: Snippet;
	}

	let { value = $bindable(), onValueChange, disabled = false, children }: Props = $props();

	let isOpen = $state(false);
	let triggerRef = $state<HTMLElement | null>(null);

	setContext('select', {
		getValue: () => value,
		setValue: (newValue: string) => {
			value = newValue;
			onValueChange?.(newValue);
			isOpen = false;
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
		}
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
