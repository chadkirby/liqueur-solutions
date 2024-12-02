<script lang="ts">
	import NumberSpinner from '../NumberSpinner.svelte';
	import { Sweetener } from '$lib';
	import { format } from '$lib/utils.js';
	import ReadOnlyValue from '../ReadOnlyValue.svelte';
	import type { DisplayProps } from './display-props.js';
	import AlternateHelper, { type Alternate } from './AlternateHelper.svelte';
	import Helper from '../ui-primitives/Helper.svelte';

	let { componentId, component, readonly, class: classProp }: DisplayProps = $props();

	let grams = $derived(component.mass);
	const alternates: Alternate[] = [
		{ options: { unit: 'oz' }, fn: (g: number) => g / 28.3495 },
		{ options: { unit: 'lb' }, fn: (g: number) => g / 453.592 },
		{ options: { unit: 'kg' }, fn: (g: number) => g / 1000 }
	];
</script>

<div class="mx-1 min-w-0 w-full {classProp}">
	<Helper>Mass</Helper>
	{#if component instanceof Sweetener && !readonly}
		<NumberSpinner
			value={grams}
			type="mass"
			componentId={componentId}
		/>
	{:else}
		<ReadOnlyValue>{format(grams, { unit: 'g' })}</ReadOnlyValue>
	{/if}
	<AlternateHelper base={grams} {alternates} />
</div>
