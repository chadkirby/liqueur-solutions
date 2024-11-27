<script lang="ts">
	import NumberSpinner from '../NumberSpinner.svelte';
	import { mixtureStore, Sweetener } from '$lib';
	import { Helper } from 'svelte-5-ui-lib';
	import { format } from '$lib/utils.js';
	import ReadOnlyValue from '../ReadOnlyValue.svelte';
	import type { DisplayProps } from './display-props.js';
	import AlternateHelper, { type Alternate } from './AlternateHelper.svelte';

	let { componentId, component, class: classProp }: DisplayProps = $props();

	let grams = $derived(component.mass);
	const alternates: Alternate[] = [
		{ options: { unit: 'oz' }, fn: (g: number) => g / 28.3495 },
		{ options: { unit: 'lb' }, fn: (g: number) => g / 453.592 },
		{ options: { unit: 'kg' }, fn: (g: number) => g / 1000 }
	];
</script>

<div class="mx-1 min-w-0 w-full {classProp}">
	<Helper>Mass</Helper>
	{#if component instanceof Sweetener}
		<NumberSpinner
			value={grams}
			format={(v) => `${format(v, { unit: 'g' })}`}
			onValueChange={(v) => mixtureStore.setMass(componentId, v)}
		/>
	{:else}
		<ReadOnlyValue>{format(grams, { unit: 'g' })}</ReadOnlyValue>
	{/if}
	<AlternateHelper base={grams} {alternates} />
</div>
