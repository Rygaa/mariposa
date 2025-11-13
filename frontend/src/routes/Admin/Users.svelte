<script lang="ts">
  import { onMount } from "svelte";
  import AvailableHeightContainer from "../../lib/components/AvailableHeightContainer.svelte";
  import Button from "../../lib/components/Button.svelte";
  import CreateUserModal from "./components/CreateUserModal.svelte";
  import UpdateUserModal from "./components/UpdateUserModal.svelte";
  import DeleteUserModal from "./components/DeleteUserModal.svelte";
  import { _globalStore } from "../../store/globalStore.svelte";
  import { navigate } from "svelte-routing";
  import { trpc } from "../../lib/trpc";

  let users = $state<any[]>([]);
  let showCreateUserModal = $state(false);
  let showUpdateUserModal = $state(false);
  let showDeleteUserModal = $state(false);
  let selectedUser = $state<any>(null);
  let isLoading = $state(false);
  let searchQuery = $state("");

  onMount(async () => {
    await loadUsers();
  });

  async function loadUsers() {
    isLoading = true;
    try {
      const result = await trpc.getAllUsers.query();
      if (result.success) {
        users = result.data;
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
    isLoading = false;
  }

  function openCreateUserModal() {
    showCreateUserModal = true;
  }

  function closeCreateUserModal() {
    showCreateUserModal = false;
  }

  function openUpdateUserModal(user: any) {
    selectedUser = user;
    showUpdateUserModal = true;
  }

  function closeUpdateUserModal() {
    showUpdateUserModal = false;
    selectedUser = null;
  }

  function openDeleteUserModal(user: any) {
    selectedUser = user;
    showDeleteUserModal = true;
  }

  function closeDeleteUserModal() {
    showDeleteUserModal = false;
    selectedUser = null;
  }

  const filteredUsers = $derived(
    users.filter((user) => {
      const query = searchQuery.toLowerCase();
      return (
        user.email?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query) ||
        user.firstName?.toLowerCase().includes(query) ||
        user.lastName?.toLowerCase().includes(query)
      );
    })
  );

  function getRoleBadgeClass(roles: string[]) {
    return roles?.includes("ADMIN")
      ? "bg-purple-100 text-purple-800 border-purple-300"
      : "bg-blue-100 text-blue-800 border-blue-300";
  }
  
  function getRoleDisplay(roles: string[]) {
    if (!roles || roles.length === 0) return "MEMBER";
    return roles.includes("ADMIN") ? "ADMIN" : roles[0];
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
</script>

<AvailableHeightContainer>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
      <p class="text-gray-600">Manage user accounts and permissions</p>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <!-- Header with search and create button -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex-1 max-w-md">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clip-rule="evenodd"
                ></path>
              </svg>
            </div>
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Search users..."
              class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <Button onclick={openCreateUserModal}>
          <span class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"
              ></path>
            </svg>
            Create User
          </span>
        </Button>
      </div>

      {#if isLoading}
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      {:else}
        <!-- Users table -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscription
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#if filteredUsers.length > 0}
                {#each filteredUsers as user}
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                          <div
                            class="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold"
                          >
                            {user.firstName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                          </div>
                        </div>
                        <div class="ml-4">
                          <div class="text-sm font-medium text-gray-900">
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user.username || "No name"}
                          </div>
                          {#if user.username}
                            <div class="text-sm text-gray-500">@{user.username}</div>
                          {/if}
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span
                        class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border {getRoleBadgeClass(
                          user.role
                        )}"
                      >
                        {getRoleDisplay(user.role)}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      {#if user.subscriptionEndDate}
                        <div class="text-sm text-gray-900">
                          {new Date(user.subscriptionEndDate) > new Date() ? "Active" : "Expired"}
                        </div>
                        <div class="text-xs text-gray-500">
                          Until {formatDate(user.subscriptionEndDate)}
                        </div>
                      {:else}
                        <span class="text-sm text-gray-400">No subscription</span>
                      {/if}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onclick={() => openUpdateUserModal(user)}
                        class="text-indigo-600 hover:text-indigo-900 mr-4"
                        title="Edit user"
                      >
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
                          ></path>
                        </svg>
                      </button>
                      <button
                        onclick={() => openDeleteUserModal(user)}
                        class="text-red-600 hover:text-red-900"
                        title="Delete user"
                      >
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fill-rule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clip-rule="evenodd"
                          ></path>
                        </svg>
                      </button>
                    </td>
                  </tr>
                {/each}
              {:else}
                <tr>
                  <td colspan="6" class="px-6 py-12 text-center">
                    <div class="text-gray-400">
                      <svg
                        class="mx-auto h-12 w-12 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        ></path>
                      </svg>
                      <p class="text-lg font-medium">
                        {searchQuery ? "No users found" : "No users yet"}
                      </p>
                      <p class="text-sm mt-1">
                        {searchQuery
                          ? "Try a different search term"
                          : "Create your first user to get started"}
                      </p>
                    </div>
                  </td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>

        {#if filteredUsers.length > 0}
          <div class="mt-4 text-sm text-gray-500">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        {/if}
      {/if}
    </div>
  </div>
</AvailableHeightContainer>

<CreateUserModal bind:isOpen={showCreateUserModal} onClose={closeCreateUserModal} onUserCreated={loadUsers} />

<UpdateUserModal
  bind:isOpen={showUpdateUserModal}
  user={selectedUser}
  onClose={closeUpdateUserModal}
  onUserUpdated={loadUsers}
/>

<DeleteUserModal
  bind:isOpen={showDeleteUserModal}
  user={selectedUser}
  onClose={closeDeleteUserModal}
  onUserDeleted={loadUsers}
/>
