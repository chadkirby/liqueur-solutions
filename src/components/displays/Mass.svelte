<script lang="ts">
	import NumberSpinner from '../NumberSpinner.svelte';
	import { format } from '$lib/utils.js';
	import AltUnitValue from '../AltUnitValue.svelte';
	import type { DisplayProps } from './display-props.js';
	import Helper from '../ui-primitives/Helper.svelte';
	import { isSubstance, isSweetener } from '$lib/mixture.js';

	let {
		componentId,
		component,
		mixtureStore,
		readonly,
		class: classProp,
		mass,
	}: DisplayProps = $props();

	let grams = $derived(mass);
</script>

<div class={classProp} data-testid="mass-{componentId}">
	<Helper class="tracking-tight">Mass</Helper>
	{#if isSweetener(component) && !readonly}
		<NumberSpinner {mixtureStore} value={grams} type="mass" {componentId} />
		<Helper class="text-center">{format(grams / 28.3495, { unit: 'oz' })}</Helper>
	{:else if isSubstance(component)}
		<AltUnitValue
			value={grams}
			type="mass"
			molecularMass={component.substance.molecule.molecularMass}
		/>
	{:else}
		<AltUnitValue value={grams} type="mass" />
	{/if}
</div>
