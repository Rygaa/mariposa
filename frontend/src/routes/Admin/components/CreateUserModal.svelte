<script lang="ts">
  import Modal from "../../../lib/components/Modal.svelte";
  import Button from "../../../lib/components/Button.svelte";
  import Input from "../../../lib/components/Input.svelte";
  import { trpc } from "../../../lib/trpc";

  let {
    isOpen = $bindable(false),
    onClose,
    onUserCreated,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onUserCreated: () => void;
  } = $props();

  let email = $state("");
  let password = $state("");
  let firstName = $state("");
  let lastName = $state("");
  let username = $state("");
  let role = $state<string[]>(["MEMBER"]);
  let selectedRoleType = $state<"MEMBER" | "ADMIN">("MEMBER");
  let subscriptionEndDate = $state("");
  let isSubmitting = $state(false);
  let error = $state("");

  function resetForm() {
    email = "";
    password = "";
    firstName = "";
    lastName = "";
    username = "";
    role = ["MEMBER"];
    selectedRoleType = "MEMBER";
    subscriptionEndDate = "";
    error = "";
  }
  
  $effect(() => {
    role = selectedRoleType === "ADMIN" ? ["ADMIN"] : ["MEMBER"];
  });

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    error = "";

    if (!email || !password) {
      error = "Email and password are required";
      return;
    }

    isSubmitting = true;

    try {
      const result = await trpc.createUser.mutate({
        email,
        password,
        firstName,
        lastName,
        username,
        role,
        subscriptionEndDate: subscriptionEndDate || undefined,
      });

      if (result.success) {
        onUserCreated();
        handleClose();
      }
    } catch (err: any) {
      error = err.message || "Failed to create user";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<Modal bind:isOpen title="Create New User" size="lg">
  <div class="space-y-4">
    {#if error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    {/if}

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input label="First Name" type="text" bind:value={firstName} placeholder="John" />

      <Input label="Last Name" type="text" bind:value={lastName} placeholder="Doe" />
    </div>

    <Input label="Username" type="text" bind:value={username} placeholder="johndoe" />

    <Input label="Email *" type="email" bind:value={email} placeholder="user@example.com" required />

    <Input label="Password *" type="password" bind:value={password} placeholder="Min 8 characters" required />

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
      <Button onclick={handleClose} variant="secondary" disabled={isSubmitting}>Cancel</Button>
      <Button onclick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create User"}
      </Button>
    </div>
  </div>
</Modal>
