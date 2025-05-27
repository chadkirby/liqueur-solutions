<script lang="ts">
	import VolumeSpinner from './VolumeSpinner.svelte';
	import AltUnitValue from '../AltUnitValue.svelte';
	import Helper from '../ui-primitives/Helper.svelte';
	import { format as _format } from '$lib/utils.js';
	import { isSweetenerId } from '$lib/ingredients/substances.js';
	import type { IngredientItem } from '$lib/mixture-types.js';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';

	let {
		ingredientId,
		volume,
		mixtureStore,
		readonly,
		class: classProp,
		header = 'Volume',
	}: {
		ingredientId: string;
		component: IngredientItem;
		volume: number;
		mixtureStore: MixtureStore;
		header?: string;
		readonly?: boolean;
		class?: string;
	} = $props();

	let ml = $derived(volume);
</script>

<div class={classProp} data-testid="volume-detail">
	<Helper class="tracking-tight">{header}</Helper>

	{#if isSweetenerId(ingredientId) || readonly}
		<AltUnitValue value={ml} type="volume" />
	{:else}
		<VolumeSpinner {ingredientId} volume={ml} {mixtureStore} />
		<Helper class="text-center">{_format(ml * 0.033814, { unit: 'fl_oz' })}</Helper>
	{/if}
</div>
