<script lang="ts">
	import type { Snippet } from "svelte";
	import type { SvelteHTMLElements} from 'svelte/elements';

	type HTMLProps = SvelteHTMLElements['p'];
	type PropKeys = keyof HTMLProps;
	type EventKeys = Extract<PropKeys, `on${string}`> extends infer K
		? K extends `on:${string}` ? never : K
		: never;

  let { children, class: classProp, ...handlers }: {
    children: Snippet,
    class?: string,
    [key: `on${string}`]: (e: Event) => void
  } & Pick<HTMLProps, EventKeys> = $props();
</script>

<p class="text-xs font-normal text-primary-500 dark:text-primary-400 {classProp}" {...handlers}>
  {@render children()}
</p>
