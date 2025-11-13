<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "../../lib/components/Icon.svelte";
  import Category from "./components/Category.svelte";
  import CreateCategoryModal from "./components/CreateCategoryModal.svelte";
  import { _globalStore } from "../../store/globalStore.svelte";
  import { navigate } from "svelte-routing";
  import { trpc } from "../../lib/trpc";
  import Page from "../../lib/shadcn/Page.svelte";
  import DataDisplayer from "../../lib/shadcn/DataDisplayer.svelte";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "../../lib/shadcn/Card/index";
  import type { getCategoryById } from "../../../../backend/src/router.types";

  let categories = $state<getCategoryById["category"][]>([]);
  let isLoading = $state(false);
  let searchQuery = $state("");
  let filterUnlisted = $state<string>("all");

  onMount(async () => {
    if (!_globalStore.user) {
      navigate("/login", { replace: true });
      return;
    }
    await loadCategories();
  });

  async function loadCategories() {
    isLoading = true;
    try {
      const filters: any = {};

      if (searchQuery) {
        filters.search = searchQuery;
      }

      if (filterUnlisted !== "all") {
        filters.isUnlisted = filterUnlisted === "unlisted";
      }

      const result = await trpc.listCategories.query(filters);
      if (result.success) {
        categories = result.categories;
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
    isLoading = false;
  }

  $effect(() => {
    loadCategories();
  });

  const filteredCategories = $derived(categories);
</script>

<Page>
  <Card>
    <CardHeader>
      <CardTitle>Categories</CardTitle>
      <CreateCategoryModal onCategoryCreated={loadCategories} />
    </CardHeader>
    <CardContent class="px-4 flex flex-col">
      <div class="mb-6">
        <div
          class="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between"
        >
          <div class="flex-1 flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div class="flex-1 max-w-md">
              <div class="relative">
                <div
                  class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                >
                  <Icon iconName="search" class="text-gray-400" />
                </div>
                <input
                  type="text"
                  bind:value={searchQuery}
                  placeholder="Search categories..."
                  class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <DataDisplayer {isLoading} isEmpty={filteredCategories.length === 0}>
        <div
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {#each filteredCategories as category (category.id)}
            <Category
              {category}
            />
          {/each}
        </div>
      </DataDisplayer>
    </CardContent>
  </Card>
</Page>
