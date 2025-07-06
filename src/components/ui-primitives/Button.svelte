<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';

	type HTMLProps = SvelteHTMLElements['button'];
	type Props = {
		children: Snippet;
		isActive?: boolean;
	} & HTMLProps;
	let { children, class: classProp, id, isActive, disabled, ...handlers }: Props = $props();
</script>

<button
	type="button"
	{id}
	{disabled}
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
		disabled && 'opacity-50 cursor-not-allowed',
		classProp,
	]}
>
	{@render children()}
</button>
