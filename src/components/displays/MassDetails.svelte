<script lang="ts">
	import { format as _format } from '$lib/utils.js';
	import AltUnitValue from '../AltUnitValue.svelte';
	import type { DisplayProps } from './display-props.js';
	import Helper from '../ui-primitives/Helper.svelte';
	import { isSubstance, isSweetener } from '$lib/mixture.js';
	import MassSpinner from './MassSpinner.svelte';

	let {
		ingredientId,
		ingredientItem,
		mixtureStore,
		readonly,
		class: classProp,
		mass,
	}: DisplayProps = $props();

	let grams = $derived(mass);
</script>

<div class={classProp} data-testid="mass-{ingredientId}">
	<Helper class="tracking-tight">Mass</Helper>
	{#if isSweetener(ingredientItem) && !readonly}
		<MassSpinner {ingredientId} mass={grams} {mixtureStore} unitSuffix="g" />
		<Helper class="text-center">{_format(grams / 28.3495, { unit: 'oz' })}</Helper>
	{:else if isSubstance(ingredientItem)}
		<AltUnitValue
			value={grams}
			type="mass"
			molecularMass={ingredientItem.substance.molecule.molecularMass}
		/>
	{:else}
		<AltUnitValue value={grams} type="mass" />
	{/if}
</div>
