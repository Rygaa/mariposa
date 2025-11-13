<script lang="ts">
  interface Step {
    label: string;
    content: any;
  }

  interface Props {
    steps: Array<Step>;
    currentStep?: number;
  }

  let { steps, currentStep = $bindable(0) }: Props = $props();

  // Constants for layout calculation
  const STEP_WIDTH = 160; // px
  const GAP = 16; // px

  // Track previous step for animation direction
  let previousStep = $state(currentStep);
  let direction: 'forward' | 'backward' = $state('forward');

  // Computed values
  const totalSteps = $derived(steps.length);
  const isFirstStep = $derived(currentStep === 0);
  const isLastStep = $derived(currentStep === totalSteps - 1);

  // Calculate the translation for centering the active step
  // activeStepCenterPx = currentStep * (STEP_WIDTH + GAP) + STEP_WIDTH/2
  const activeStepCenterPx = $derived(
    currentStep * (STEP_WIDTH + GAP) + STEP_WIDTH / 2
  );

  // Track transform: anchor at left: 50%, then translate by -activeStepCenterPx
  const trackTransform = $derived(`translateX(calc(-${activeStepCenterPx}px))`);

  // Content transform based on direction
  const contentTransform = $derived(
    direction === 'forward' ? 'translateX(0)' : 'translateX(0)'
  );

  // Update direction when step changes
  $effect(() => {
    if (currentStep > previousStep) {
      direction = 'forward';
    } else if (currentStep < previousStep) {
      direction = 'backward';
    }
    previousStep = currentStep;
  });

  function goToStep(index: number) {
    if (index >= 0 && index < totalSteps) {
      currentStep = index;
    }
  }
</script>

<div class="w-full h-full flex flex-col">
  <!-- Step Indicators Container -->
  <div class="relative w-full overflow-hidden py-8 px-4" style="min-height: 120px;">
    <!-- Track wrapper - anchored at left: 50% -->
    <div
      class="absolute left-1/2 top-8 flex transition-transform duration-300 ease-in-out"
      style="transform: {trackTransform}; gap: {GAP}px;"
    >
      {#each steps as step, index}
        <button
          onclick={() => goToStep(index)}
          class="flex flex-col items-center transition-opacity duration-300"
          style="width: {STEP_WIDTH}px;"
        >
          <!-- Step Circle -->
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 {index ===
            currentStep
              ? 'bg-blue-600 text-white scale-110'
              : index < currentStep
                ? 'bg-green-600 text-white'
                : 'bg-gray-300 text-gray-600'}"
          >
            {#if index < currentStep}
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            {:else}
              {index + 1}
            {/if}
          </div>

          <!-- Step Label -->
          <span
            class="mt-2 text-sm font-medium transition-all duration-300 text-center {index ===
            currentStep
              ? 'text-blue-600 font-bold'
              : index < currentStep
                ? 'text-green-600'
                : 'text-gray-500'}"
          >
            {step.label}
          </span>

          <!-- Connector Line (not shown after last step) -->
          {#if index < steps.length - 1}
            <div
              class="absolute top-5 transition-all duration-300"
              style="left: {STEP_WIDTH + GAP / 2}px; width: {GAP}px;"
            >
              <div
                class="h-0.5 transition-colors duration-300 {index < currentStep
                  ? 'bg-green-600'
                  : 'bg-gray-300'}"
              ></div>
            </div>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <!-- Content Area with Slide Animation -->
  <div class="flex-1 relative overflow-hidden">
    <div class="absolute inset-0">
      {#each steps as step, index}
        {#if index === currentStep}
          <div
            class="absolute inset-0 transition-all duration-300 ease-in-out"
            style="transform: {contentTransform}; opacity: 1;"
          >
            <div class="h-full overflow-auto p-6">
              {#if typeof step.content === 'string'}
                <div class="prose max-w-none">
                  {@html step.content}
                </div>
              {:else}
                {@const Component = step.content}
                <Component />
              {/if}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  </div>
</div>
