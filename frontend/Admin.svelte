<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { _globalStore } from "./src/store/globalStore.svelte";
  import AvailableHeightContainer from "./src/lib/components/AvailableHeightContainer.svelte";
  import Button from "./src/lib/components/Button.svelte";
  import { trpc } from "./src/lib/trpc";

  let settings = $state<any>(null);
  let isLoading = $state(false);
  let isSaving = $state(false);
  let message = $state("");

  onMount(async () => {
    if (!_globalStore.user || !_globalStore.user.role?.includes("ADMIN")) {
      navigate("/learning", { replace: true });
      return;
    }

    // Load settings
    await loadSettings();
  });

  async function loadSettings() {
    isLoading = true;
    try {
      const result = await trpc.getSettings.query();
      if (result.success) {
        settings = result.settings;
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      message = "Failed to load settings";
    } finally {
      isLoading = false;
    }
  }

  async function updateShouldCountRawMaterial(value: boolean) {
    isSaving = true;
    message = "";
    try {
      const result = await trpc.updateSettings.mutate({
        shouldCountRawMaterial: value,
      });
      if (result.success) {
        settings = result.settings;
        message = "Setting updated successfully!";
        setTimeout(() => {
          message = "";
        }, 3000);
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      message = "Failed to update setting";
    } finally {
      isSaving = false;
    }
  }
</script>

<AvailableHeightContainer>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
      <p class="text-gray-600">System administration and management</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- User Management Card -->
      <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"
              ></path>
            </svg>
          </div>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
        <p class="text-gray-600 text-sm mb-4">Manage users, roles, and permissions</p>
        <Button onclick={() => navigate("/users")} variant="secondary">
          <span class="flex items-center gap-2">
            Manage Users
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </span>
        </Button>
      </div>

      <!-- System Stats Card -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"
              ></path>
            </svg>
          </div>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">System Statistics</h3>
        <p class="text-gray-600 text-sm mb-4">View system performance and usage</p>
        <div class="text-gray-400 text-sm">Coming soon...</div>
      </div>

      <!-- Settings Card -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </div>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">System Settings</h3>
        <p class="text-gray-600 text-sm mb-4">Configure system preferences</p>
        
        {#if isLoading}
          <div class="text-gray-500 text-sm">Loading settings...</div>
        {:else if settings}
          <div class="space-y-4">
            <!-- Should Count Raw Material Toggle -->
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm font-medium text-gray-700">Count Raw Material</div>
                <p class="text-xs text-gray-500 mt-1">Enable raw material counting in inventory</p>
              </div>
              <button
                onclick={() => updateShouldCountRawMaterial(!settings.shouldCountRawMaterial)}
                disabled={isSaving}
                aria-label="Toggle raw material counting"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 {settings.shouldCountRawMaterial ? 'bg-purple-600' : 'bg-gray-200'} {isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {settings.shouldCountRawMaterial ? 'translate-x-6' : 'translate-x-1'}"
                ></span>
              </button>
            </div>
            
            {#if message}
              <div class="text-sm {message.includes('success') ? 'text-green-600' : 'text-red-600'}">
                {message}
              </div>
            {/if}
          </div>
        {:else}
          <div class="text-gray-400 text-sm">Failed to load settings</div>
        {/if}
      </div>
    </div>

    <!-- Additional Info -->
    <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          ></path>
        </svg>
        <div>
          <h4 class="text-sm font-semibold text-blue-900 mb-1">Admin Access</h4>
          <p class="text-sm text-blue-700">
            You have administrative privileges. Please use these tools responsibly.
          </p>
        </div>
      </div>
    </div>
  </div>
</AvailableHeightContainer>
