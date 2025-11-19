<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Popover, PopoverTrigger, PopoverContent } from '../Popover';

	interface Props {
		value?: Date;
		onValueChange?: (date: Date | undefined) => void;
		placeholder?: string;
		disabled?: boolean;
		class?: string;
		children?: Snippet;
	}

	let {
		value = $bindable(),
		onValueChange,
		placeholder = 'Pick a date and time',
		disabled = false,
		class: className = '',
		children
	}: Props = $props();

	let open = $state(false);
	let selectedDate = $state(value || new Date());
	let currentMonth = $state(value ? new Date(value.getFullYear(), value.getMonth(), 1) : new Date());

	// Time states
	let hours = $state(value ? value.getHours() : 12);
	let minutes = $state(value ? value.getMinutes() : 0);
	let isPM = $state(value ? value.getHours() >= 12 : false);

	const monthNames = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];

	const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

	function getDaysInMonth(date: Date) {
		const year = date.getFullYear();
		const month = date.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startingDayOfWeek = firstDay.getDay();

		const days: (number | null)[] = [];

		// Add empty cells for days before the first day of month
		for (let i = 0; i < startingDayOfWeek; i++) {
			days.push(null);
		}

		// Add days of month
		for (let i = 1; i <= daysInMonth; i++) {
			days.push(i);
		}

		return days;
	}

	function selectDate(day: number | null) {
		if (day === null) return;

		const newDate = new Date(
			currentMonth.getFullYear(),
			currentMonth.getMonth(),
			day,
			isPM ? (hours === 12 ? 12 : hours + 12) : hours === 12 ? 0 : hours,
			minutes
		);

		selectedDate = newDate;
		value = newDate;
		onValueChange?.(newDate);
	}

	function previousMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
	}

	function nextMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
	}

	function isToday(day: number | null) {
		if (day === null) return false;
		const today = new Date();
		return (
			day === today.getDate() &&
			currentMonth.getMonth() === today.getMonth() &&
			currentMonth.getFullYear() === today.getFullYear()
		);
	}

	function isSelected(day: number | null) {
		if (day === null || !value) return false;
		return (
			day === value.getDate() &&
			currentMonth.getMonth() === value.getMonth() &&
			currentMonth.getFullYear() === value.getFullYear()
		);
	}

	function updateTime() {
		if (!value) {
			const newDate = new Date();
			newDate.setHours(isPM ? (hours === 12 ? 12 : hours + 12) : hours === 12 ? 0 : hours);
			newDate.setMinutes(minutes);
			value = newDate;
			selectedDate = newDate;
			onValueChange?.(newDate);
		} else {
			const newDate = new Date(value);
			newDate.setHours(isPM ? (hours === 12 ? 12 : hours + 12) : hours === 12 ? 0 : hours);
			newDate.setMinutes(minutes);
			value = newDate;
			selectedDate = newDate;
			onValueChange?.(newDate);
		}
	}

	function handleHoursChange(e: Event) {
		const target = e.target as HTMLInputElement;
		let newHours = parseInt(target.value) || 12;
		if (newHours < 1) newHours = 1;
		if (newHours > 12) newHours = 12;
		hours = newHours;
		updateTime();
	}

	function handleMinutesChange(e: Event) {
		const target = e.target as HTMLInputElement;
		let newMinutes = parseInt(target.value) || 0;
		if (newMinutes < 0) newMinutes = 0;
		if (newMinutes > 59) newMinutes = 59;
		minutes = newMinutes;
		updateTime();
	}

	function togglePeriod() {
		isPM = !isPM;
		updateTime();
	}

	function setToNow() {
		const now = new Date();
		selectedDate = now;
		value = now;
		currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		hours = now.getHours() > 12 ? now.getHours() - 12 : now.getHours() === 0 ? 12 : now.getHours();
		minutes = now.getMinutes();
		isPM = now.getHours() >= 12;
		onValueChange?.(now);
	}

	function formatDateTime(date: Date | undefined) {
		if (!date) return placeholder;
		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	$effect(() => {
		if (value) {
			selectedDate = value;
			currentMonth = new Date(value.getFullYear(), value.getMonth(), 1);
			hours = value.getHours() > 12 ? value.getHours() - 12 : value.getHours() === 0 ? 12 : value.getHours();
			minutes = value.getMinutes();
			isPM = value.getHours() >= 12;
		}
	});

	let days = $derived(getDaysInMonth(currentMonth));
</script>

<Popover bind:open>
	<PopoverTrigger
		class="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {className}"
		{disabled}
	>
		{#snippet children()}
			<span class={value ? 'text-gray-900' : 'text-gray-500'}>
				{formatDateTime(value)}
			</span>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="ml-2 h-4 w-4 opacity-50"
			>
				<rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
				<line x1="16" x2="16" y1="2" y2="6"></line>
				<line x1="8" x2="8" y1="2" y2="6"></line>
				<line x1="3" x2="21" y1="10" y2="10"></line>
			</svg>
		{/snippet}
	</PopoverTrigger>

	<PopoverContent class="w-auto p-0" align="start">
		{#snippet children()}
			<div class="p-3 space-y-4">
				<!-- Calendar -->
				<div class="space-y-4">
				<!-- Month/Year Navigation -->
				<div class="flex items-center justify-between">
					<button
						type="button"
						onclick={previousMonth}
						aria-label="Previous month"
						class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-gray-100 h-7 w-7"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="15 18 9 12 15 6"></polyline>
						</svg>
					</button>

					<div class="text-sm font-semibold">
						{monthNames[currentMonth.getMonth()]}
						{currentMonth.getFullYear()}
					</div>

					<button
						type="button"
						onclick={nextMonth}
						aria-label="Next month"
						class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-gray-100 h-7 w-7"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="9 18 15 12 9 6"></polyline>
						</svg>
					</button>
				</div>					<!-- Calendar Grid -->
					<div class="w-full">
						<!-- Week days header -->
						<div class="grid grid-cols-7 gap-1 mb-2">
							{#each weekDays as day}
								<div class="text-xs font-medium text-gray-500 text-center h-7 flex items-center justify-center">
									{day}
								</div>
							{/each}
						</div>

						<!-- Days grid -->
						<div class="grid grid-cols-7 gap-1">
							{#each days as day}
								{#if day === null}
									<div class="h-8 w-8"></div>
							{:else}
								<button
									type="button"
									onclick={() => selectDate(day)}
									class="h-8 w-8 text-sm rounded-md inline-flex items-center justify-center transition-colors {isSelected(day) ? 'bg-gray-900 text-white hover:bg-gray-800' : isToday(day) ? 'bg-gray-100 text-gray-900 hover:bg-gray-200' : 'text-gray-900 hover:bg-gray-100'}"
								>
									{day}
								</button>
							{/if}
							{/each}
						</div>
					</div>
				</div>

				<!-- Time Picker -->
				<div class="border-t border-gray-200 pt-3 space-y-2">
					<div class="text-xs font-medium text-gray-700 mb-2">Time</div>
					<div class="flex items-center gap-2">
						<!-- Hours -->
						<div class="flex-1">
							<input
								type="number"
								min="1"
								max="12"
								value={hours}
								oninput={handleHoursChange}
								class="w-full h-9 px-2 text-center text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-950"
							/>
						</div>

						<span class="text-sm font-semibold">:</span>

						<!-- Minutes -->
						<div class="flex-1">
							<input
								type="number"
								min="0"
								max="59"
								value={minutes.toString().padStart(2, '0')}
								oninput={handleMinutesChange}
								class="w-full h-9 px-2 text-center text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-950"
							/>
						</div>

						<!-- AM/PM Toggle -->
						<button
							type="button"
							onclick={togglePeriod}
							class="h-9 px-3 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
						>
							{isPM ? 'PM' : 'AM'}
						</button>
					</div>
				</div>

				<!-- Actions -->
				<div class="border-t border-gray-200 pt-3 flex gap-2">
					<button
						type="button"
						onclick={setToNow}
						class="flex-1 h-9 px-3 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
					>
						Now
					</button>
					<button
						type="button"
						onclick={() => (open = false)}
						class="flex-1 h-9 px-3 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
					>
						Done
					</button>
				</div>
			</div>
		{/snippet}
	</PopoverContent>
</Popover>
