<script lang="ts">
	import NumberSpinner from '../NumberSpinner.svelte';
	import AltUnitValue from '../AltUnitValue.svelte';
	import Helper from '../ui-primitives/Helper.svelte';
	import { format } from '$lib/utils.js';
	import { isSweetenerId } from '$lib/ingredients/substances.js';
	import type { IngredientItemComponent } from '$lib/mixture-types.js';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';

	let {
		componentId,
		volume,
		mixtureStore,
		readonly,
		class: classProp,
		header = 'Volume',
	}: {
		componentId: string;
		component: IngredientItemComponent;
		volume: number;
		mixtureStore: MixtureStore;
		header?: string;
		readonly?: boolean;
		class?: string;
	} = $props();

	let ml = $derived(volume);
</script>

<div class={classProp} data-testid={`volume-${componentId}`}>
	<Helper class="tracking-tight">{header}</Helper>

	{#if isSweetenerId(componentId) || readonly}
		<AltUnitValue value={ml} type="volume" />
	{:else}
		<NumberSpinner {mixtureStore} value={ml} type="volume" {componentId} />
		<Helper class="text-center">{format(ml * 0.033814, { unit: 'fl_oz' })}</Helper>
	{/if}
</div>
