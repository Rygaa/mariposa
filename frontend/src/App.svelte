<script lang="ts">
  import { onMount } from "svelte";
  import { Router, Route, navigate } from "svelte-routing";
  import Signup from "./routes/Signup/Signup.svelte";
  import Login from "./routes/Login.svelte";
  import Profile from "./routes/Profile.svelte";
  import Users from "./routes/Admin/Users.svelte";
  import EatingTables from "./routes/EatingTables/EatingTables.svelte";
  import MenuItems from "./routes/MenuItems/MenuItems.svelte";
  import AppLayout from "./lib/components/AppLayout.svelte";
  import { _globalStore } from "./store/globalStore.svelte";
  import { trpc, sendWebSocketMessage } from "./lib/trpc";
  import Categories from "./routes/Categories/Categories.svelte";
  import NodesDemo from "./routes/NodesDemo.svelte";
  import ClientOrders from "./routes/ClientOrders/ClientOrders.svelte";
  import ClientOrdersV3 from "./routes/ClientOrders/ClientOrders.svelte";
  import Orders from "./routes/Orders/ClientOrders.svelte";
  import Stats from "./routes/Stats/Stats.svelte";
  import Carts from "./routes/Carts/Carts.svelte";
  import RawMaterials from "./routes/MenuItems/RawMaterials.svelte";
  import Dashboard from "./routes/Dashboard/Dashboard.svelte";
  import Admin from "../Admin.svelte";

  $effect(() => {
    if (_globalStore.wsMessage) {
      const data = JSON.parse(_globalStore.wsMessage);
      if (data.type === "AUTH" && data.message) {
        _globalStore.loading.websocket.loading = false;
        _globalStore.loading.websocket.done = true;
      }
    }
  });

  $effect(() => {
    if (
      _globalStore.loading.websocket.done &&
      _globalStore.user &&
      _globalStore.loading.auth.done
    ) {
      sendWebSocketMessage({ user: _globalStore.user });
    }
  });

  // Redirect to login if not authenticated
  $effect(() => {
    if (!_globalStore.isAuthenticating && !_globalStore.user) {
      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && currentPath !== "/signup") {
        navigate("/login", { replace: true });
      }
    }
  });

  onMount(async () => {
    const authToken = _globalStore.getAuthToken();
    if (authToken) {
      const result = await trpc.auth.mutate();
      if (result.success) {
        _globalStore.setAuthToken(result.authToken);
        _globalStore.user = result.user;
        _globalStore.loading.websocket.loading = true;
        _globalStore.loading.auth.done = true;
      } else {
        _globalStore.setAuthToken(null);
        _globalStore.user = null;
      }
    }

    _globalStore.isAuthenticating = false;
  });

  // Centralized navigation items
  let isSidebarOpen = $state(true);

  const navigationItems = $derived([
    { name: "Dashboard", path: "/dashboard", icon: "📊", section: "main" },
    { name: "Profile", path: "/profile", icon: "👤", section: "main" },
    {
      name: "Eating Tables",
      path: "/eating-tables",
      icon: "🍽️",
      section: "main",
    },
    {
      name: "Elements",
      path: "/menu-items",
      icon: "🍕",
      section: "main",
      subItems: [
        { name: "Menu Elements", path: "/menu-items/MENU_ITEM", icon: "🍽️" },
        { name: "Recettes", path: "/menu-items/RECIPE", icon: "📖" },
        { name: "Materiels", path: "/menu-items/RAW_MATERIAL", icon: "🥕" },
        { name: "Supplements", path: "/menu-items/SUPPLEMENT", icon: "➕" },
        { name: "Options", path: "/menu-items/MENU_ITEM_OPTION", icon: "⚙️" },
      ],
    },
    {
      name: "Categories",
      path: "/categories",
      icon: "📂",
      section: "main",
    },
    { name: "Orders", path: "/orders", icon: "📋", section: "main" },
    { name: "Carts", path: "/carts", icon: "🛒", section: "main" },
    { name: "Stats", path: "/stats", icon: "📊", section: "main" },
    {
      name: "Client Orders",
      path: "/client-orders",
      icon: "📱",
      section: "main",
    },
    { name: "Users", path: "/users", icon: "👥", section: "main" },
    { name: "Nodes Demo", path: "/nodes-demo", icon: "🔗", section: "main" },
    ...(_globalStore.user?.role?.includes("ADMIN")
      ? [
          {
            name: "Admin",
            path: "/admin",
            icon: "⚙️",
            variant: "admin" as const,
          },
        ]
      : []),
  ]);

  // Handle logout
  function handleLogout() {
    _globalStore.setAuthToken(null);
    _globalStore.user = null;
    navigate("/login");
  }
</script>

{#if _globalStore.isAuthenticating || _globalStore.loading.websocket.loading}
  <div class="min-h-screen flex items-center justify-center bg-gray-50 w-full">
    <div class="text-center">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"
      ></div>
      <p class="mt-4 text-gray-600">
        {#if _globalStore.isAuthenticating}
          Loading...
        {:else if _globalStore.loading.websocket.loading}
          Connecting to server...
        {/if}
      </p>
    </div>
  </div>
{:else}
  <!-- Loading Overlay -->
  {#if _globalStore.loading.auth.loading || _globalStore.loading.websocket.loading}
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 w-full h-full"
    >
      <div class="bg-white rounded-lg shadow-xl p-8">
        <div class="text-center">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"
          ></div>
          <p class="mt-4 text-gray-700 font-medium">
            {#if _globalStore.loading.auth.loading}
              Authenticating...
            {:else if _globalStore.loading.websocket.loading}
              Connecting to server...
            {/if}
          </p>
        </div>
      </div>
    </div>
  {/if}

  <div class="flex h-full w-full bg-gray-50 overflow-x-hidden">
    <Router>
      <AppLayout {navigationItems} bind:isSidebarOpen onLogout={handleLogout}>
        {#snippet children()}
          <Route path="/signup"><Signup /></Route>
          <Route path="/login"><Login /></Route>

          {#if _globalStore.user}
            <Route path="/">
              <Dashboard />
            </Route>
            <Route path="/dashboard">
              <Dashboard />
            </Route>
            <Route path="/profile">
              <Profile />
            </Route>
            <Route path="/categories">
              <Categories />
            </Route>
            <Route path="/eating-tables">
              <EatingTables />
            </Route>
            <Route path="/menu-items">
              <MenuItems />
            </Route>
            <Route path="/menu-items/RAW_MATERIAL">
              <RawMaterials type="RAW_MATERIAL" />
            </Route>
            <Route path="/menu-items/:type" let:params>
              <MenuItems type={params.type} />
            </Route>
            <Route path="/orders">
              <Orders />
            </Route>
            <Route path="/carts">
              <Carts />
            </Route>
                  <Route path="/admin">
              <Admin />
            </Route>
            <Route path="/stats">
              <Stats />
            </Route>
            <Route path="/client-orders">
              <ClientOrdersV3 />
            </Route>
            <Route path="/users">
              <Users />
            </Route>
            <Route path="/nodes-demo">
              <NodesDemo />
            </Route>
          {/if}
        {/snippet}
      </AppLayout>
    </Router>
  </div>
{/if}
