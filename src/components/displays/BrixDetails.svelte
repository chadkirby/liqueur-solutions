<script lang="ts">
	import NumberSpinner from '../NumberSpinner.svelte';
	import { Mixture } from '$lib/mixture.js';
	import Helper from '../ui-primitives/Helper.svelte';
	import { format as _format, brixToSyrupProportion } from '$lib/utils.js';
	import AltUnitValue from '../AltUnitValue.svelte';
	import type { DisplayProps } from './display-props.js';
	import BrixSpinner from './BrixSpinner.svelte';

	let {
		ingredientId,
		ingredientItem: component,
		mixtureStore,
		readonly,
		class: classProp,
	}: DisplayProps = $props();

	let brix = $derived(component.brix ?? 0);
	// convert 50 brix to 1/1
	// convert 66.666 brix to 2/1
	// convert 75 brix to 3/1
	let parts = $derived(brix < 100 && brix >= 50 ? brixToSyrupProportion(brix) : '');
</script>

<div class={classProp} data-testid="brix-detail">
	<Helper class="tracking-tight">Sweetness</Helper>

	{#if !readonly && component instanceof Mixture && component.canEdit('brix')}
		<BrixSpinner {ingredientId} {brix} {mixtureStore} />
		<Helper class="text-center">{parts}</Helper>
	{:else}
		<AltUnitValue value={brix} type="brix" />
	{/if}
</div>
