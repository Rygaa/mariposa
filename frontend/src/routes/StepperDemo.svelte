<script lang="ts">
	import Stepper from '$lib/shadcn/Stepper_new.svelte';

	type Step = {
		id: number;
		title: string;
		content: string;
	};

	let currentStep = $state(0);
	let steps = $state<Step[]>([
		{
			id: 1,
			title: 'Welcome',
			content: 'Welcome to the multi-step interface! Click Next to continue.'
		},
		{
			id: 2,
			title: 'Getting Started',
			content: 'This stepper uses Tailwind CSS animations for smooth transitions.'
		},
		{
			id: 3,
			title: 'Features',
			content: 'Navigate using Next/Previous buttons or click on the step indicators above.'
		},
		{
			id: 4,
			title: 'Complete',
			content: 'You can also use the progress dots at the bottom to jump to any step!'
		}
	]);
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
	<div class="w-full">
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold text-gray-800 mb-2">Multi-Step Interface</h1>
			<p class="text-gray-600">Built with Svelte 5 and Tailwind CSS</p>
		</div>
		
		<Stepper bind:steps bind:currentStep />
	</div>
</div>
