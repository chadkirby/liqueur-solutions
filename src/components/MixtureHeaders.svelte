<script lang="ts" module>
	import SweetenerDropdown from './displays/SweetenerDropdown.svelte';
	import NumberSpinner from './NumberSpinner.svelte';
	import TextInput from './ui-primitives/TextInput.svelte';
	import type { IngredientItem, IngredientSubstanceItem } from '$lib/mixture-types.js';
	import CitrusDropdown from './displays/CitrusDropdown.svelte';
	import AcidDropdown from './displays/AcidDropdown.svelte';
	import SaltDropdown from './displays/SaltDropdown.svelte';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';
	import { Tooltip } from 'svelte-5-ui-lib';

	export {
		defaultHeader,
		sweetenerHeader,
		simpleSyrupHeader,
		spiritHeader,
		citrusHeader,
		acidHeader,
		saltHeader,
	};
	// For the numeric spinner (leftmost)
	const numericBase = 'w-24 shrink-0'; // Fixed width for number + unit

	// For secondary inputs (dropdowns, ABV, etc)
	const secondaryInputBase = 'w-18 shrink-0'; // Fixed width for consistency
</script>

{#snippet nameInput(mixtureStore: MixtureStore, ingredient: IngredientItem)}
	<TextInput
		type="text"
		value={ingredient.name}
		placeholder={ingredient.item.describe()}
		class={[
			// allow the input to take remaining space while properly shrinking
			'min-w-0',
			'flex-1',
			'mr-2',
			'leading-[18px]',
			'focus:ring-2',
			'focus:border-blue-200',
			'focus:ring-blue-200',
		]}
		onclick={(e) => e.stopPropagation()}
		oninput={(e) => mixtureStore.updateComponentName(ingredient.id, e.currentTarget.value)}
	/>
{/snippet}

{#snippet defaultHeader(mixtureStore: MixtureStore, ingredient: IngredientItem, volume: number)}
	<NumberSpinner
		{mixtureStore}
		class={numericBase}
		value={volume}
		type="volume"
		componentId={ingredient.id}
	/>

	{@render nameInput(mixtureStore, ingredient)}
{/snippet}

{#snippet sweetenerHeader(mixtureStore: MixtureStore, ingredient: IngredientItem, mass: number)}
	<NumberSpinner
		{mixtureStore}
		class={numericBase}
		value={mass}
		type="mass"
		componentId={ingredient.id}
	/>
	<SweetenerDropdown
		{mixtureStore}
		componentId={ingredient.id}
		component={ingredient.item}
		class={secondaryInputBase}
		onclick={(e) => e.stopPropagation()}
	/>
	{@render nameInput(mixtureStore, ingredient)}
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
		class={numericBase}
		value={volume}
		type="volume"
		componentId={ingredient.id}
	/>

	<NumberSpinner
		{mixtureStore}
		id={`edit-brix-${ingredient.id}`}
		class={secondaryInputBase}
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
	{@render nameInput(mixtureStore, ingredient)}
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
		class={numericBase}
		value={volume}
		type="volume"
		componentId={ingredient.id}
	/>

	<NumberSpinner
		{mixtureStore}
		id={`edit-abv-${ingredient.id}`}
		class={numericBase}
		value={abv}
		type="abv"
		componentId={ingredient.id}
	/>
	{@render nameInput(mixtureStore, ingredient,)}
{/snippet}

{#snippet citrusHeader(mixtureStore: MixtureStore, ingredient: IngredientItem, volume: number)}
	<NumberSpinner
		{mixtureStore}
		class={numericBase}
		value={volume}
		type="volume"
		componentId={ingredient.id}
	/>
	<CitrusDropdown
		{mixtureStore}
		componentId={ingredient.id}
		component={ingredient.item}
		class={secondaryInputBase}
		onclick={(e) => e.stopPropagation()}
	/>
	{@render nameInput(mixtureStore, ingredient)}
{/snippet}

{#snippet acidHeader(mixtureStore: MixtureStore, ingredient: IngredientSubstanceItem, mass: number)}
	<NumberSpinner
		{mixtureStore}
		class={numericBase}
		value={mass}
		type="mass"
		componentId={ingredient.id}
	/>
	<AcidDropdown
		{mixtureStore}
		componentId={ingredient.id}
		component={ingredient.item}
		class={secondaryInputBase}
		onclick={(e) => e.stopPropagation()}
	/>
	{@render nameInput(mixtureStore, ingredient)}
{/snippet}

{#snippet saltHeader(mixtureStore: MixtureStore, ingredient: IngredientSubstanceItem, mass: number)}
	<NumberSpinner
		{mixtureStore}
		class={numericBase}
		value={mass}
		type="mass"
		componentId={ingredient.id}
	/>
	<SaltDropdown
		{mixtureStore}
		componentId={ingredient.id}
		component={ingredient.item}
		class={secondaryInputBase}
		onclick={(e) => e.stopPropagation()}
	/>
	{@render nameInput(mixtureStore, ingredient)}
{/snippet}
