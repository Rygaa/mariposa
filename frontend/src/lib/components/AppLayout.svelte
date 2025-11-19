<script lang="ts">
  import { useLocation } from "svelte-routing";
  import Sidebar from "./Sidebar.svelte";
  import { isInProtectedRoutes, shouldShowSidebar } from "../../utils/routes";
  import { _globalStore } from "../../store/globalStore.svelte";

  interface Props {
    navigationItems: any[];
    isSidebarOpen: boolean;
    onLogout: () => void;
  }

  let { navigationItems, isSidebarOpen = $bindable(), onLogout }: Props = $props();

  const location = useLocation();
</script>

{#if _globalStore.user && shouldShowSidebar($location)}
  <Sidebar
    title="Mariposa"
    bind:isOpen={isSidebarOpen}
    {navigationItems}
    {onLogout}
  />
{/if}

<slot />
