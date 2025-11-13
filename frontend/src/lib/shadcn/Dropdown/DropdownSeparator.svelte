<script lang="ts">
  let {
    class: className = "",
  }: {
    class?: string;
  } = $props();
</script>

<div class="-mx-1 my-1 h-px bg-gray-200 {className}"></div>
