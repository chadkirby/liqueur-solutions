<script lang="ts">
	import type { Snippet } from "svelte";

  let { children, class: classProp, ...handlers }: {
    children: Snippet,
    class?: string,
    [key: `on${string}`]: (e: Event) => void
  } = $props();
</script>

<p class="text-xs font-normal text-slate-500 dark:text-slate-400 {classProp}" {...handlers}>
  {@render children()}
</p>
