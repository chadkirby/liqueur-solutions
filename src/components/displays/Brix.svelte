<script lang="ts">
	import NumberSpinner from '../NumberSpinner.svelte';
	import { Mixture } from '$lib';
	import Helper from '../ui-primitives/Helper.svelte';
	import { brixToSyrupProportion, format } from '$lib/utils.js';
	import ReadOnlyValue from '../ReadOnlyValue.svelte';
	import type { DisplayProps } from './display-props.js';

	let { componentId, component, readonly, class: classProp }: DisplayProps = $props();

	let brix = $derived(component.brix ?? 0);
	// convert 50 brix to 1/1
	// convert 66.666 brix to 2/1
	// convert 75 brix to 3/1
	let parts = $derived(brix < 100 && brix >= 50 ? brixToSyrupProportion(brix) : '');
</script>

<div class="mx-1 min-w-0 w-full {classProp}">
	<Helper>Sweetness</Helper>

	{#if !readonly && component instanceof Mixture && component.canEdit('equivalentSugarMass')}
		<NumberSpinner
			value={brix}
			type="brix"
			componentId={componentId}
		/>
	{:else}
		<ReadOnlyValue>{format(brix, { unit: '%' })}</ReadOnlyValue>
	{/if}
	<Helper class="text-center">{parts}</Helper>
</div>
