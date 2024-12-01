<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SvelteHTMLElements} from 'svelte/elements';

	type HTMLProps = SvelteHTMLElements['button'];
type PropKeys = keyof HTMLProps;
type EventKeys = Extract<PropKeys, `on${string}`> extends infer K
  ? K extends `on:${string}` ? never : K
  : never;

	let {
		children,
		class: classProp,
		id,
		isActive,
		...handlers
	}: {
		children: Snippet;
		isActive?: boolean;
		class?: string;
		id?: string;
	} & Pick<HTMLProps, EventKeys> = $props();
	let activeClass = $derived(
		isActive ? `!bg-primary-200 !dark:bg-primary-700 !dark:border-primary-600` : ''
	);
</script>

<button
	type="button"
	{id}
	{...handlers}
	class="
    text-center
    font-medium
    text-sm
    items-center
    justify-center
    text-primary-900
    bg-white
    hover:bg-primary-100
    dark:bg-primary-800
    dark:text-white
    dark:hover:bg-primary-700
    dark:hover:border-primary-600
    focus-within:ring-primary-200
    dark:focus-within:ring-primary-700
    focus-within:ring-4
    focus-within:outline-none
    border
    border-primary-300
    dark:border-primary-400
    rounded-md
    px-0.5
    py-0.5
    flex
    flex-row
    gap-1
    {activeClass}
    {classProp}"
>
	{@render children()}
</button>
