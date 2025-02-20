<script lang="ts" module>
	import Cal from './displays/Cal.svelte';
	import Brix from './displays/Brix.svelte';
	import EquivalentSugar from './displays/EquivalentSugar.svelte';
	import type { IngredientItem, IngredientSubstanceItem } from '$lib/mixture-types.js';
	import Helper from './ui-primitives/Helper.svelte';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';
	import Mass from './displays/Mass.svelte';
	import Volume from './displays/Volume.svelte';
	import { Mixture } from '$lib/mixture.js';
	import Ph from './displays/PH.svelte';
	import ReadOnlyValue from './ReadOnlyValue.svelte';
	import ABV from './displays/ABV.svelte';
	import { isAcidId, isSweetenerId } from '$lib/ingredients/substances.js';

	export {
		saltDetails,
		sweetenerDetails,
		waterDetails,
		spiritDetails,
		syrupDetails,
		acidDetails,
		citrusDetails,
		totals,
	};

	/**
	 * return the boiling temperature of a solution at a given ABV
	 *
	 * @param liquidAbv - The ABV of the solution
	 *
	 * @returns The boiling temperature of the solution in Fahrenheit
	 */
	function abvToBoilTemp(liquidAbv: number): number[] {
		let abvPercent = liquidAbv / 100;
		const degC = Number(
			// return the ºC temperature at which a solution at ABV will boil
			60.526 * abvPercent ** 4 -
				163.16 * abvPercent ** 3 +
				163.96 * abvPercent ** 2 -
				83.438 * abvPercent +
				100,
		);
		const degF = (degC * 9) / 5 + 32;
		return [degF, degC];
	}
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
	{@const basis = 'basis-1/5'}
	<Mass {mixtureStore} componentId={id} {component} {mass} readonly={true} class={basis} />
	<Volume
		{mixtureStore}
		componentId={id}
		header="Alcohol Vol."
		{component}
		volume={component.alcoholVolume}
		readonly={true}
		class={basis}
	/>
	<Volume
		{mixtureStore}
		componentId={id}
		header="Water Vol."
		{component}
		volume={component.waterVolume}
		readonly={true}
		class={basis}
	/>
	<div class={basis} data-testid="boil-{id}">
		<Helper class="tracking-tight">Boiling Pt.</Helper>
		<ReadOnlyValue
			values={abvToBoilTemp(component.abv)}
			formatOptions={[{ unit: 'F' }, { unit: 'C' }]}
			connector="&thinsp;/&thinsp;"
		/>
	</div>

	<Cal {mixtureStore} componentId={id} {component} {mass} readonly={true} class={basis} />
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
		<ReadOnlyValue values={substance.pKa ?? [NaN]} formatOptions={[{ unit: 'pH' }]} />
	</div>
	<div class="mx-1 basis-1/4">
		<Helper class="tracking-tight">Density</Helper>
		<ReadOnlyValue values={[density]} formatOptions={[{ unit: 'g/ml' }]} />
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
	{@const basis = substance.pKa.length ? 'basis-1/4' : 'basis-1/3'}
	<Volume
		{mixtureStore}
		componentId={id}
		component={substance}
		{volume}
		readonly={true}
		class={basis}
	/>
	{#if substance.pKa.length}
		<div class="mx-1 {basis}">
			<Helper class="tracking-tight">𝗉𝘒<sub>𝖺</sub></Helper>
			<ReadOnlyValue values={substance.pKa} formatOptions={[{ unit: 'pH' }]} />
		</div>
	{/if}
	<div class="mx-1 {basis}">
		<Helper class="tracking-tight">Density</Helper>
		<ReadOnlyValue values={[density]} formatOptions={[{ unit: 'g/ml' }]} />
	</div>

	<Cal {mixtureStore} componentId={id} component={substance} {mass} readonly={true} class={basis} />
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

{#snippet totals(
	mixtureStore: MixtureStore,
	parentId: null | string,
	mixture: Mixture,
	className = 'w-24 shrink-0',
)}
	{@const isIngredient = parentId !== null}
	{@const id = isIngredient ? parentId : 'totals'}
	{@const mass = isIngredient ? mixture.mass : mixtureStore.getMass(id)}
	{@const volume = isIngredient ? mixture.volume : mixtureStore.getVolume(id)}
	<!-- TOTALS -->
	<Volume
		{mixtureStore}
		componentId={id}
		component={mixture}
		volume={volume}
		class={className}
		readonly={isIngredient}
	/>
	<Mass
		{mixtureStore}
		componentId={parentId === null ? 'totals' : parentId}
		component={mixture}
		{mass}
		class={className}
	/>
	{#if mixture.eachSubstance().some(({ substanceId }) => substanceId === 'ethanol')}
		<ABV {mixtureStore} componentId={id} component={mixture} {mass} class={className} />
	{/if}
	{#if mixture.eachSubstance().some(({ substanceId }) => isSweetenerId(substanceId))}
		<Brix {mixtureStore} componentId={id} component={mixture} {mass} class={className} />
	{/if}
	{#if mixture.eachSubstance().some(({ substanceId }) => isAcidId(substanceId))}
		<Ph
			{mixtureStore}
			componentId={parentId === null ? 'totals' : parentId}
			component={mixture}
			{mass}
			class={className}
		/>
	{/if}
	<Cal
		{mixtureStore}
		componentId={parentId === null ? 'totals' : parentId}
		component={mixture}
		{mass}
		class={className}
	/>
{/snippet}
