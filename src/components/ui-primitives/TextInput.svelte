<script lang="ts">
	import type { SvelteHTMLElements } from 'svelte/elements';

	type HTMLProps = SvelteHTMLElements['input'];
	type PropKeys = keyof HTMLProps;
	type EventKeys =
		Extract<PropKeys, `on${string}`> extends infer K
			? K extends `on:${string}`
				? never
				: K
			: never;

	let {
		value,
		type = 'text',
		class: classProp,
		id,
		placeholder = '',
		...handlers
	}: {
		value: string;
		type?: 'text' | 'number';
		class?: string | string[];
		id?: string;
		placeholder?: string;
	} & Pick<HTMLProps, EventKeys> = $props();
</script>

<input
	{type}
	{value}
	{id}
	{placeholder}
	autocomplete="off"
	class={[
    'block',
		'ls-rounded-box',
    'w-full',
    'rtl:text-right',
    'px-1',
    'py-0.5',
    classProp
	]}
	{...handlers}
/>

<style>
	/* Hide the spin buttons */
	input[type='number']::-webkit-inner-spin-button,
	input[type='number']::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	input[type='number'] {
		-moz-appearance: textfield;
		appearance: textfield;
	}
</style>
