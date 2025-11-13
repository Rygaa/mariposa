<script lang="ts">
  import Modal from "../../../lib/components/Modal.svelte";
  import Button from "../../../lib/components/Button.svelte";
  import Input from "../../../lib/components/Input.svelte";
  import { trpc } from "../../../lib/trpc";

  let {
    isOpen = $bindable(false),
    user,
    onClose,
    onUserUpdated,
  }: {
    isOpen: boolean;
    user: any | null;
    onClose: () => void;
    onUserUpdated: () => void;
  } = $props();

  let email = $state("");
  let firstName = $state("");
  let lastName = $state("");
  let username = $state("");
  let role = $state<string[]>(["MEMBER"]);
  let selectedRoleType = $state<"MEMBER" | "ADMIN">("MEMBER");
  let subscriptionEndDate = $state("");
  let isSubmitting = $state(false);
  let error = $state("");

  $effect(() => {
    if (isOpen && user) {
      email = user.email || "";
      firstName = user.firstName || "";
      lastName = user.lastName || "";
      username = user.username || "";
      role = user.role || ["MEMBER"];
      selectedRoleType = user.role?.includes("ADMIN") ? "ADMIN" : "MEMBER";
      subscriptionEndDate = user.subscriptionEndDate
        ? new Date(user.subscriptionEndDate).toISOString().split("T")[0]
        : "";
    }
  });
  
  $effect(() => {
    role = selectedRoleType === "ADMIN" ? ["ADMIN"] : ["MEMBER"];
  });

  function handleClose() {
    error = "";
    onClose();
  }

  async function handleSubmit() {
    error = "";

    if (!email) {
      error = "Email is required";
      return;
    }

    isSubmitting = true;

    try {
      const result = await trpc.updateUser.mutate({
        id: user.id,
        email,
        firstName,
        lastName,
        username,
        role,
        subscriptionEndDate: subscriptionEndDate || null,
      });

      if (result.success) {
        onUserUpdated();
        handleClose();
      }
    } catch (err: any) {
      error = err.message || "Failed to update user";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<Modal bind:isOpen title="Edit User" size="lg">
  {#if user}
    <div class="space-y-4">
      {#if error}
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      {/if}

      <div class="bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg">
        <div class="flex items-center gap-2 text-blue-700">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd"
            ></path>
          </svg>
          <span class="text-sm">User ID: {user.id}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="First Name" type="text" bind:value={firstName} placeholder="John" />

        <Input label="Last Name" type="text" bind:value={lastName} placeholder="Doe" />
      </div>

      <Input label="Username" type="text" bind:value={username} placeholder="johndoe" />

      <Input label="Email *" type="email" bind:value={email} placeholder="user@example.com" required />

      <div>
        <label for="role-select" class="block text-sm font-medium text-gray-700 mb-2"> Role * </label>
        <select
          id="role-select"
          bind:value={selectedRoleType}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      <Input label="Subscription End Date" type="date" bind:value={subscriptionEndDate} />

      <div class="flex justify-end space-x-3 pt-4 border-t">
        <Button type="button" onclick={handleClose} variant="secondary" disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="button" onclick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  {/if}
</Modal>
