<script module lang="ts">
	import SweetenerDropdown from './displays/SweetenerDropdown.svelte';

	import Cal from './displays/Cal.svelte';
	import Brix from './displays/Brix.svelte';

	import NumberSpinner from './NumberSpinner.svelte';

	import TextInput from './ui-primitives/TextInput.svelte';

	import EquivalentSugar from './displays/EquivalentSugar.svelte';

	import type { IngredientItem, IngredientSubstanceItem } from '$lib/mixture-types.js';
	import CitrusDropdown from './displays/CitrusDropdown.svelte';
	import AcidDropdown from './displays/AcidDropdown.svelte';
	import Helper from './ui-primitives/Helper.svelte';
	import ReadOnlyValue from './ReadOnlyValue.svelte';
	import SaltDropdown from './displays/SaltDropdown.svelte';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';
	import { Tooltip } from 'svelte-5-ui-lib';
	import Mass from './displays/Mass.svelte';
	import Volume from './displays/Volume.svelte';
	import { Mixture } from '$lib/mixture.js';
	import Ph from './displays/PH.svelte';

	export {
		defaultHeader,
		sweetenerHeader,
		simpleSyrupHeader,
		spiritHeader,
		citrusHeader,
		acidHeader,
		saltHeader,
		saltDetails,
		sweetenerDetails,
		waterDetails,
		spiritDetails,
		syrupDetails,
		acidDetails,
		citrusDetails,
	};
</script>

{#snippet nameInput(mixtureStore: MixtureStore, ingredient: IngredientItem, basis = 'basis-3/4')}
	<TextInput
		type="text"
		value={ingredient.name}
		placeholder={ingredient.item.describe()}
		class="
			mr-2
			{basis}
			text-sm
			leading-[18px]
			focus:ring-2
			focus:border-blue-200
			focus:ring-blue-200
			"
		onclick={(e) => e.stopPropagation()}
		oninput={(e) => mixtureStore.updateComponentName(ingredient.id, e.currentTarget.value)}
	/>
{/snippet}

{#snippet defaultHeader(mixtureStore: MixtureStore, ingredient: IngredientItem, volume: number)}
	<NumberSpinner
		{mixtureStore}
		class="basis-1/4"
		value={volume}
		type="volume"
		componentId={ingredient.id}
	/>

	{@render nameInput(mixtureStore, ingredient, 'basis-3/4')}
{/snippet}

{#snippet sweetenerHeader(mixtureStore: MixtureStore, ingredient: IngredientItem, mass: number)}
	<NumberSpinner
		{mixtureStore}
		class="basis-1/5"
		value={mass}
		type="mass"
		componentId={ingredient.id}
	/>
	<SweetenerDropdown
		{mixtureStore}
		componentId={ingredient.id}
		component={ingredient.item}
		basis="basis-1/3"
		onclick={(e) => e.stopPropagation()}
	/>
	{@render nameInput(mixtureStore, ingredient, 'basis-1/3')}
{/snippet}

{#snippet simpleSyrupHeader(
	mixtureStore: MixtureStore,
	ingredient: IngredientItem,
	volume: number,
	brix: number,
)}
	<Tooltip color="default" offset={6} triggeredBy={`#edit-brix-${ingredient.id}`}>Sweetness</Tooltip
	>

	<NumberSpinner
		{mixtureStore}
		class="basis-1/6"
		value={volume}
		type="volume"
		componentId={ingredient.id}
	/>

	<NumberSpinner
		{mixtureStore}
		id={`edit-brix-${ingredient.id}`}
		class="basis-1/6"
		value={brix * 100}
		type="brix"
		componentId={ingredient.id}
	/>

	<SweetenerDropdown
		{mixtureStore}
		componentId={ingredient.id}
		component={ingredient.item}
		basis="basis-1/3"
		onclick={(e) => e.stopPropagation()}
	/>
	{@render nameInput(mixtureStore, ingredient, 'basis-1/3')}
{/snippet}

{#snippet spiritHeader(
	mixtureStore: MixtureStore,
	ingredient: IngredientItem,
	volume: number,
	abv: number,
)}
	<Tooltip color="default" offset={6} triggeredBy={`#edit-abv-${ingredient.id}`}>ABV</Tooltip>

	<NumberSpinner
		{mixtureStore}
		class="basis-1/5"
		value={volume}
		type="volume"
		componentId={ingredient.id}
	/>

	<NumberSpinner
		{mixtureStore}
		id={`edit-abv-${ingredient.id}`}
		class="basis-1/5"
		value={abv}
		type="abv"
		componentId={ingredient.id}
	/>
	{@render nameInput(mixtureStore, ingredient, 'basis-3/5')}
{/snippet}

{#snippet citrusHeader(mixtureStore: MixtureStore, ingredient: IngredientItem, volume: number)}
	<NumberSpinner
		{mixtureStore}
		class="basis-1/4"
		value={volume}
		type="volume"
		componentId={ingredient.id}
	/>
	<CitrusDropdown
		{mixtureStore}
		componentId={ingredient.id}
		component={ingredient.item}
		basis="basis-1/4"
		onclick={(e) => e.stopPropagation()}
	/>
	{@render nameInput(mixtureStore, ingredient, 'basis-1/2')}
{/snippet}

{#snippet acidHeader(mixtureStore: MixtureStore, ingredient: IngredientSubstanceItem, mass: number)}
	<NumberSpinner
		{mixtureStore}
		class="basis-1/4"
		value={mass}
		type="mass"
		componentId={ingredient.id}
	/>
	<AcidDropdown
		{mixtureStore}
		componentId={ingredient.id}
		component={ingredient.item}
		basis="basis-1/4"
		onclick={(e) => e.stopPropagation()}
	/>
	{@render nameInput(mixtureStore, ingredient, 'basis-1/2')}
{/snippet}

{#snippet saltHeader(mixtureStore: MixtureStore, ingredient: IngredientSubstanceItem, mass: number)}
	<NumberSpinner
		{mixtureStore}
		class="basis-1/4"
		value={mass}
		type="mass"
		componentId={ingredient.id}
	/>
	<SaltDropdown
		{mixtureStore}
		componentId={ingredient.id}
		component={ingredient.item}
		basis="basis-1/2"
		onclick={(e) => e.stopPropagation()}
	/>
	{@render nameInput(mixtureStore, ingredient, 'basis-1/2')}
{/snippet}

{#snippet sweetenerDetails(
	mixtureStore: MixtureStore,
	ingredient: IngredientItem,
	mass: number,
	volume: number,
)}
	{@const id = ingredient.id}
	{@const component = ingredient.item}
	<div class="flex flex-row my-1">
		<Mass {mixtureStore} componentId={id} {component} {mass} readonly={true} class="basis-1/4" />
		<Volume
			{mixtureStore}
			componentId={id}
			{component}
			{volume}
			readonly={true}
			class="basis-1/4"
		/>
		<EquivalentSugar
			{mixtureStore}
			componentId={id}
			{component}
			{mass}
			readonly={true}
			class="basis-1/4"
		/>
		<Cal {mixtureStore} componentId={id} {component} {mass} readonly={true} class="basis-1/4" />
	</div>
{/snippet}

{#snippet waterDetails(
	mixtureStore: MixtureStore,
	ingredient: IngredientItem,
	mass: number,
	volume: number,
)}
	{@const id = ingredient.id}
	{@const component = ingredient.item}
	<div class="flex flex-row my-1">
		<Volume
			{mixtureStore}
			componentId={id}
			{component}
			{volume}
			readonly={true}
			class="basis-1/2"
		/>
		<Mass {mixtureStore} componentId={id} {component} {mass} readonly={true} class="basis-1/2" />
	</div>
{/snippet}

{#snippet spiritDetails(
	mixtureStore: MixtureStore,
	ingredient: IngredientItem,
	mass: number,
	_volume: number,
)}
	{@const id = ingredient.id}
	{@const component = ingredient.item as Mixture}
	<div class="flex flex-row my-1">
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
	</div>
{/snippet}

{#snippet syrupDetails(
	mixtureStore: MixtureStore,
	ingredient: IngredientItem,
	mass: number,
	volume: number,
)}
	{@const id = ingredient.id}
	{@const component = ingredient.item}
	<div class="flex flex-row my-1">
		<Volume
			{mixtureStore}
			componentId={id}
			{component}
			{volume}
			readonly={true}
			class="basis-1/4"
		/>
		<Mass {mixtureStore} componentId={id} {component} {mass} readonly={true} class="basis-1/4" />
		<Brix {mixtureStore} componentId={id} {component} {mass} readonly={true} class="basis-1/4" />
		<Cal {mixtureStore} componentId={id} {component} {mass} readonly={true} class="basis-1/4" />
	</div>
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
	<div class="flex flex-row my-1">
		<Volume
			{mixtureStore}
			componentId={id}
			component={substance}
			{volume}
			readonly={true}
			class="basis-1/4"
		/>
		<div class="mx-1 min-w-0 w-full basis-1/4">
			<Helper class="tracking-tight">𝗉𝘒<sub>𝖺</sub></Helper>
			<ReadOnlyValue value={substance.pKa.at(0) ?? NaN} type="pH" />
		</div>
		<div class="mx-1 min-w-0 w-full basis-1/4">
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
	</div>
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
	<div class="flex flex-row my-1">
		<Volume
			{mixtureStore}
			componentId={id}
			component={substance}
			{volume}
			readonly={true}
			class="basis-1/4"
		/>
		<div class="mx-1 min-w-0 w-full basis-1/4">
			<Helper class="tracking-tight">𝗉𝘒<sub>𝖺</sub></Helper>
			<ReadOnlyValue value={substance.pKa.at(0) ?? NaN} type="pH" />
		</div>
		<div class="mx-1 min-w-0 w-full basis-1/4">
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
	</div>
{/snippet}

{#snippet citrusDetails(
	mixtureStore: MixtureStore,
	ingredient: IngredientItem,
	mass: number,
	volume: number,
)}
	{@const id = ingredient.id}
	{@const component = ingredient.item}
	<div class="flex flex-row my-1">
		<Mass {mixtureStore} componentId={id} {component} {mass} readonly={true} class="basis-1/4" />
		<Ph {mixtureStore} componentId={id} {component} {mass} class="basis-1/4 min-w-20 grow-0" />
		<Brix
			{mixtureStore}
			componentId={id}
			{component}
			{mass}
			class="basis-1/4 min-w-20 grow-0"
		/>
		<Cal {mixtureStore} componentId={id} {component} {mass} readonly={true} class="basis-1/4" />
	</div>
{/snippet}
