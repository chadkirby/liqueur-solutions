<script lang="ts" module>
	import Cal from './displays/Cal.svelte';
	import Brix from './displays/Brix.svelte';
	import EquivalentSugar from './displays/EquivalentSugar.svelte';
	import type { IngredientItem, IngredientSubstanceItem } from '$lib/mixture-types.js';
	import Helper from './ui-primitives/Helper.svelte';
	import ReadOnlyValue from './ReadOnlyValue.svelte';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';
	import Mass from './displays/Mass.svelte';
	import Volume from './displays/Volume.svelte';
	import { Mixture } from '$lib/mixture.js';
	import Ph from './displays/PH.svelte';

	export {
		saltDetails,
		sweetenerDetails,
		waterDetails,
		spiritDetails,
		syrupDetails,
		acidDetails,
		citrusDetails,
	};
</script>

{#snippet sweetenerDetails(
	mixtureStore: MixtureStore,
	ingredient: IngredientItem,
	mass: number,
	volume: number,
)}
	{@const id = ingredient.id}
	{@const component = ingredient.item}
	<Mass {mixtureStore} componentId={id} {component} {mass} readonly={true} class="basis-1/4" />
	<Volume {mixtureStore} componentId={id} {component} {volume} readonly={true} class="basis-1/4" />
	<EquivalentSugar
		{mixtureStore}
		componentId={id}
		{component}
		{mass}
		readonly={true}
		class="basis-1/4"
	/>
	<Cal {mixtureStore} componentId={id} {component} {mass} readonly={true} class="basis-1/4" />
{/snippet}

{#snippet waterDetails(
	mixtureStore: MixtureStore,
	ingredient: IngredientItem,
	mass: number,
	volume: number,
)}
	{@const id = ingredient.id}
	{@const component = ingredient.item}
	<Volume {mixtureStore} componentId={id} {component} {volume} readonly={true} class="basis-1/2" />
	<Mass {mixtureStore} componentId={id} {component} {mass} readonly={true} class="basis-1/2" />
{/snippet}

{#snippet spiritDetails(
	mixtureStore: MixtureStore,
	ingredient: IngredientItem,
	mass: number,
	_volume: number,
)}
	{@const id = ingredient.id}
	{@const component = ingredient.item as Mixture}
	<Mass {mixtureStore} componentId={id} {component} {mass} readonly={true} class="basis-1/5" />
	<Volume
		{mixtureStore}
		componentId={id}
		header="Alcohol Volume"
		{component}
		volume={component.alcoholVolume}
		readonly={true}
		class="basis-1/4"
	/>
	<Volume
		{mixtureStore}
		componentId={id}
		header="Water Volume"
		{component}
		volume={component.waterVolume}
		readonly={true}
		class="basis-1/4"
	/>
	<Cal {mixtureStore} componentId={id} {component} {mass} readonly={true} class="basis-1/4" />
{/snippet}

{#snippet syrupDetails(
	mixtureStore: MixtureStore,
	ingredient: IngredientItem,
	mass: number,
	volume: number,
)}
	{@const id = ingredient.id}
	{@const component = ingredient.item}
	<Volume {mixtureStore} componentId={id} {component} {volume} readonly={true} class="basis-1/4" />
	<Mass {mixtureStore} componentId={id} {component} {mass} readonly={true} class="basis-1/4" />
	<Brix {mixtureStore} componentId={id} {component} {mass} readonly={true} class="basis-1/4" />
	<Cal {mixtureStore} componentId={id} {component} {mass} readonly={true} class="basis-1/4" />
{/snippet}

{#snippet acidDetails(
	mixtureStore: MixtureStore,
	ingredient: IngredientSubstanceItem,
	mass: number,
	volume: number,
)}
	{@const id = ingredient.id}
	{@const substance = ingredient.item}
	{@const density = substance.pureDensity}
	<Volume
		{mixtureStore}
		componentId={id}
		component={substance}
		{volume}
		readonly={true}
		class="basis-1/4"
	/>
	<div class="mx-1 basis-1/4">
		<Helper class="tracking-tight">𝗉𝘒<sub>𝖺</sub></Helper>
		<ReadOnlyValue value={substance.pKa ?? NaN} type="pH" />
	</div>
	<div class="mx-1 basis-1/4">
		<Helper class="tracking-tight">Density</Helper>
		<ReadOnlyValue value={density} type="density" />
	</div>

	<Cal
		{mixtureStore}
		componentId={id}
		component={substance}
		{mass}
		readonly={true}
		class="basis-1/4"
	/>
{/snippet}

{#snippet saltDetails(
	mixtureStore: MixtureStore,
	ingredient: IngredientSubstanceItem,
	mass: number,
	volume: number,
)}
	{@const id = ingredient.id}
	{@const substance = ingredient.item}
	{@const density = substance.pureDensity}
	<Volume
		{mixtureStore}
		componentId={id}
		component={substance}
		{volume}
		readonly={true}
		class="basis-1/4"
	/>
	<div class="mx-1 basis-1/4">
		<Helper class="tracking-tight">𝗉𝘒<sub>𝖺</sub></Helper>
		<ReadOnlyValue value={substance.pKa.at(0) ?? NaN} type="pH" />
	</div>
	<div class="mx-1 basis-1/4">
		<Helper class="tracking-tight">Density</Helper>
		<ReadOnlyValue value={density} type="density" />
	</div>

	<Cal
		{mixtureStore}
		componentId={id}
		component={substance}
		{mass}
		readonly={true}
		class="basis-1/4"
	/>
{/snippet}

{#snippet citrusDetails(
	mixtureStore: MixtureStore,
	ingredient: IngredientItem,
	mass: number,
	volume: number,
)}
	{@const id = ingredient.id}
	{@const component = ingredient.item}
	<Mass {mixtureStore} componentId={id} {component} {mass} readonly={true} class="basis-1/4" />
	<Ph {mixtureStore} componentId={id} {component} {mass} class="basis-1/4 min-w-20 grow-0" />
	<Brix {mixtureStore} componentId={id} {component} {mass} class="basis-1/4 min-w-20 grow-0" />
	<Cal {mixtureStore} componentId={id} {component} {mass} readonly={true} class="basis-1/4" />
{/snippet}
