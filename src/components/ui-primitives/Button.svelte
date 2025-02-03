<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';

	type HTMLProps = SvelteHTMLElements['button'];
	type PropKeys = keyof HTMLProps;
	type EventKeys =
		Extract<PropKeys, `on${string}`> extends infer K
			? K extends `on:${string}`
				? never
				: K
			: never;
	type Props = {
		children: Snippet;
		isActive?: boolean;
		class?: string;
		id?: string;
	} & Pick<HTMLProps, EventKeys>;
	let { children, class: classProp, id, isActive, ...handlers }: Props = $props();
</script>

<button
	type="button"
	{id}
	{...handlers}
	class={[
    'text-center',
    'ls-rounded-box',
    'font-medium',
    'items-center',
    'justify-center',
    'flex',
    'flex-row',
    'gap-1',
    isActive && '!bg-primary-200 !dark:bg-primary-700 !dark:border-primary-600',
    classProp
    ]}
>
	{@render children()}
</button>
