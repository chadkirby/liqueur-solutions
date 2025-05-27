<script lang="ts" module>
	import Cal from './displays/Cal.svelte';
	import Brix from './displays/BrixDetails.svelte';
	import EquivalentSugar from './displays/EquivalentSugar.svelte';
	import Helper from './ui-primitives/Helper.svelte';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';
	import MassDetails from './displays/MassDetails.svelte';
	import VolumeDetails from './displays/VolumeDetails.svelte';
	import { isMixture, Mixture } from '$lib/mixture.js';
	import PhDetails from './displays/PHDetails.svelte';
	import ReadOnlyValue from './ReadOnlyValue.svelte';
	import type {
		InMemoryIngredient,
		InMemoryMixture,
		InMemorySubstance,
	} from '$lib/mixture-types.js';

	export {
		saltDetails,
		sweetenerDetails,
		defaultDetails,
		spiritDetails,
		syrupDetails,
		acidDetails,
		citrusDetails,
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

	const widthClass = 'flex-auto min-w-16 max-w-30';
</script>

{#snippet sweetenerDetails(
	mixtureStore: MixtureStore,
	ingredient: InMemoryIngredient,
	mass: number,
	volume: number,
)}
	{@const id = ingredient.id}
	{@const component = ingredient.item}
	<MassDetails
		{mixtureStore}
		ingredientId={id}
		ingredientItem={component}
		{mass}
		readonly={true}
		class={widthClass}
	/>
	<VolumeDetails
		{mixtureStore}
		ingredientId={id}
		{component}
		{volume}
		readonly={true}
		class={widthClass}
	/>
	<EquivalentSugar
		{mixtureStore}
		ingredientId={id}
		ingredientItem={component}
		{mass}
		readonly={true}
		class={widthClass}
	/>
	<Cal
		{mixtureStore}
		ingredientId={id}
		ingredientItem={component}
		{mass}
		readonly={true}
		class={widthClass}
	/>
{/snippet}

{#snippet defaultDetails(
	mixtureStore: MixtureStore,
	ingredient: InMemoryIngredient,
	mass: number,
	volume: number,
)}
	{@const id = ingredient.id}
	{@const component = ingredient.item}
	{@const density = isMixture(component) ? component.getDensity() : component.pureDensity}
	<VolumeDetails
		{mixtureStore}
		ingredientId={id}
		{component}
		{volume}
		readonly={true}
		class={widthClass}
	/>
	<MassDetails
		{mixtureStore}
		ingredientId={id}
		ingredientItem={component}
		{mass}
		readonly={true}
		class={widthClass}
	/>
	<div class={['mx-1', widthClass]}>
		<Helper class="tracking-tight">Density</Helper>
		<ReadOnlyValue values={[density]} formatOptions={[{ unit: 'g/ml' }]} />
	</div>

	<Cal
		{mixtureStore}
		ingredientId={id}
		ingredientItem={component}
		{mass}
		readonly={true}
		class={widthClass}
	/>
{/snippet}

{#snippet spiritDetails(
	mixtureStore: MixtureStore,
	ingredient: InMemoryMixture,
	mass: number,
	_volume: number,
)}
	{@const id = ingredient.id}
	{@const component = ingredient.item as Mixture}
	<MassDetails
		{mixtureStore}
		ingredientId={id}
		ingredientItem={component}
		{mass}
		readonly={true}
		class={widthClass}
	/>
	<VolumeDetails
		{mixtureStore}
		ingredientId={id}
		header="Alcohol Vol."
		{component}
		volume={component.getAlcoholVolume(mass)}
		readonly={true}
		class={widthClass}
	/>
	<VolumeDetails
		{mixtureStore}
		ingredientId={id}
		header="Water Vol."
		{component}
		volume={component.getWaterVolume(mass)}
		readonly={true}
		class={widthClass}
	/>
	<div class={widthClass} data-testid="boil-detail">
		<Helper class="tracking-tight">Boiling Pt.</Helper>
		<ReadOnlyValue
			values={abvToBoilTemp(component.abv)}
			formatOptions={[{ unit: 'F' }, { unit: 'C' }]}
			connector="&thinsp;/&thinsp;"
		/>
	</div>

	<Cal
		{mixtureStore}
		ingredientId={id}
		ingredientItem={component}
		{mass}
		readonly={true}
		class={widthClass}
	/>
{/snippet}

{#snippet syrupDetails(
	mixtureStore: MixtureStore,
	ingredient: InMemoryMixture,
	mass: number,
	volume: number,
)}
	{@const id = ingredient.id}
	{@const component = ingredient.item}
	<VolumeDetails
		{mixtureStore}
		ingredientId={id}
		{component}
		{volume}
		readonly={true}
		class={widthClass}
	/>
	<MassDetails
		{mixtureStore}
		ingredientId={id}
		ingredientItem={component}
		{mass}
		readonly={true}
		class={widthClass}
	/>
	<Brix
		{mixtureStore}
		ingredientId={id}
		ingredientItem={component}
		{mass}
		readonly={true}
		class={widthClass}
	/>
	<Cal
		{mixtureStore}
		ingredientId={id}
		ingredientItem={component}
		{mass}
		readonly={true}
		class={widthClass}
	/>
{/snippet}

{#snippet acidDetails(
	mixtureStore: MixtureStore,
	ingredient: InMemorySubstance,
	mass: number,
	volume: number,
)}
	{@const id = ingredient.id}
	{@const substance = ingredient.item}
	{@const density = substance.pureDensity}
	<VolumeDetails
		{mixtureStore}
		ingredientId={id}
		component={substance}
		{volume}
		readonly={true}
		class={widthClass}
	/>
	<div class={['mx-1', widthClass]}>
		<Helper class="tracking-tight">𝗉𝘒<sub>𝖺</sub></Helper>
		<ReadOnlyValue values={substance.pKa ?? [NaN]} formatOptions={[{ unit: 'pH' }]} />
	</div>
	<div class={['mx-1', widthClass]}>
		<Helper class="tracking-tight">Density</Helper>
		<ReadOnlyValue values={[density]} formatOptions={[{ unit: 'g/ml' }]} />
	</div>

	<Cal
		{mixtureStore}
		ingredientId={id}
		ingredientItem={substance}
		{mass}
		readonly={true}
		class={widthClass}
	/>
{/snippet}

{#snippet saltDetails(
	mixtureStore: MixtureStore,
	ingredient: InMemorySubstance,
	mass: number,
	volume: number,
)}
	{@const id = ingredient.id}
	{@const substance = ingredient.item}
	{@const density = substance.pureDensity}
	{@const basis = substance.pKa.length ? 'basis-1/4' : 'basis-1/3'}
	<VolumeDetails
		{mixtureStore}
		ingredientId={id}
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

	<Cal
		{mixtureStore}
		ingredientId={id}
		ingredientItem={substance}
		{mass}
		readonly={true}
		class={basis}
	/>
{/snippet}

{#snippet citrusDetails(mixtureStore: MixtureStore, ingredient: InMemoryMixture, mass: number)}
	{@const id = ingredient.id}
	{@const component = ingredient.item}
	<MassDetails
		{mixtureStore}
		ingredientId={id}
		ingredientItem={component}
		{mass}
		readonly={true}
		class={widthClass}
	/>
	<PhDetails
		{mixtureStore}
		ingredientId={id}
		ingredientItem={component}
		{mass}
		readonly={true}
		class={widthClass}
	/>
	<Brix
		{mixtureStore}
		ingredientId={id}
		ingredientItem={component}
		{mass}
		readonly={true}
		class={widthClass}
	/>
	<Cal
		{mixtureStore}
		ingredientId={id}
		ingredientItem={component}
		{mass}
		readonly={true}
		class={widthClass}
	/>
{/snippet}
