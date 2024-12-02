<script lang="ts">
	import { Sweetener } from '$lib';
	import NumberSpinner from '../NumberSpinner.svelte';
	import { format } from '$lib/utils.js';
	import ReadOnlyValue from '../ReadOnlyValue.svelte';
	import type { DisplayProps } from './display-props.js';
	import AlternateHelper, { type Alternate } from './AlternateHelper.svelte';
	import Helper from '../ui-primitives/Helper.svelte';

	let { componentId, component, readonly, class: classProp }: DisplayProps = $props();

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
	{#if component instanceof Sweetener || readonly}
		<ReadOnlyValue>{format(ml, { unit: 'ml' })}</ReadOnlyValue>
	{:else}
		<NumberSpinner
			value={ml}
			type="volume"
			componentId={componentId}
		/>
	{/if}
	<AlternateHelper base={ml} {alternates} />
</div>
