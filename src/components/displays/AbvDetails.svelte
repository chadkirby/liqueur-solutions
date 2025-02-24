<script lang="ts">
	import { Mixture } from '$lib/mixture.js';
	import Helper from '../ui-primitives/Helper.svelte';
	import AltUnitValue from '../AltUnitValue.svelte';
	import type { DisplayProps } from './display-props.js';
	import AbvSpinner from './AbvSpinner.svelte';
	import { format } from '$lib/utils.js';

	let {
		ingredientItem,
		ingredientId,
		mixtureStore,
		readonly,
		class: classProp,
	}: DisplayProps = $props();

	let abv = $derived(ingredientItem.abv);
	let proof = $derived(abv * 2);
</script>

<div class={classProp} data-testid="abv-{ingredientId}">
	<Helper class="tracking-tight">ABV</Helper>
	{#if !readonly && ingredientItem instanceof Mixture && ingredientItem.canEdit('abv')}
		<AbvSpinner {ingredientId} {abv} {mixtureStore} />
		<Helper class="text-center">{format(proof, { unit: 'proof' })}</Helper>
	{:else}
		<AltUnitValue value={abv} type="abv" />
	{/if}
</div>
