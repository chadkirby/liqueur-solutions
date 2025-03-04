<script lang="ts">
	import { format } from '$lib/utils.js';
	import AltUnitValue from '../AltUnitValue.svelte';
	import type { DisplayProps } from './display-props.js';
	import Helper from '../ui-primitives/Helper.svelte';
	import { Sweeteners } from '$lib/ingredients/substances.js';

	let { ingredientItem: component, class: classProp, mass }: DisplayProps = $props();

	let esm = $derived(component.getEquivalentSugarMass(mass));
	const sucrose = Sweeteners.find(s => s.id === 'sucrose')!;
	let equivCal = $derived(esm * sucrose.kcal);
</script>

<div class={classProp}>
	<Helper>≈ Sugar</Helper>
	<AltUnitValue value={esm} type="mass" />
	<Helper class="text-center">{format(equivCal, { unit: 'kcal' })}</Helper>
</div>
