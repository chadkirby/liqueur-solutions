<script lang="ts">
	import { mixtureStore, Sweetener } from '$lib';
	import { Helper } from 'svelte-5-ui-lib';
	import NumberSpinner from '../NumberSpinner.svelte';
	import { format } from '$lib/utils.js';
	import ReadOnlyValue from '../ReadOnlyValue.svelte';
	import type { DisplayProps } from './display-props.js';
	import AlternateHelper, { type Alternate } from './AlternateHelper.svelte';

	let { componentId, component, class: classProp }: DisplayProps = $props();

	let ml = $derived(component.volume);
	const alternates: Alternate[] = [
		{ options: { unit: 'tsp', decimal: 'decimal' }, fn: (v: number) => v * 0.202884 },
		{ options: { unit: 'tbsp', decimal: 'decimal' }, fn: (v: number) => v * 0.0676288 },
		{ options: { unit: `fl_oz` }, fn: (v: number) => v * 0.033814 },
		{ options: { unit: 'cups', decimal: 'fraction' }, fn: (v: number) => v * 0.00422675 }
	];
</script>

<div class="mx-1 min-w-0 w-full {classProp}">
	<Helper>Volume</Helper>
	{#if component instanceof Sweetener}
		<ReadOnlyValue>{format(ml, { unit: 'ml' })}</ReadOnlyValue>
	{:else}
		<NumberSpinner
			value={ml}
			format={(v) => `${format(v, { unit: 'ml' })}`}
			onValueChange={(v) => mixtureStore.setVolume(componentId, v)}
		/>
	{/if}
	<AlternateHelper base={ml} {alternates} />
</div>
