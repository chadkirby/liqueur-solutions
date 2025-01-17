<script lang="ts">
	import { Accordion, AccordionItem, Tooltip } from 'svelte-5-ui-lib';
	import SweetenerDropdown from './displays/SweetenerDropdown.svelte';
	import Mass from './displays/Mass.svelte';
	import Volume from './displays/Volume.svelte';
	import Cal from './displays/Cal.svelte';
	import Brix from './displays/Brix.svelte';
	import RemoveButton from './RemoveButton.svelte';
	import MixtureAccordion from './MixtureAccordion.svelte';
	import NumberSpinner from './NumberSpinner.svelte';
	import AddComponent from './nav/AddComponent.svelte';
	import VolumeComponent from './displays/Volume.svelte';
	import ABVComponent from './displays/ABV.svelte';
	import BrixComponent from './displays/Brix.svelte';
	import CalComponent from './displays/Cal.svelte';
	import MassComponent from './displays/Mass.svelte';
	import Button from './ui-primitives/Button.svelte';
	import TextInput from './ui-primitives/TextInput.svelte';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';
	import { serializeToUrl } from '$lib/url-serialization.js';
	import EquivalentSugar from './displays/EquivalentSugar.svelte';
	import Abv from './displays/ABV.svelte';
	import {
		isMixture,
		isSimpleSpirit,
		isSimpleSyrup,
		isSweetener,
		isWater,
		isCitrusMixture
	} from '$lib/mixture.js';
	import Ph from './displays/PH.svelte';
	import type { IngredientItem } from '$lib/mixture-types.js';
	import CitrusDropdown from './displays/CitrusDropdown.svelte';

	let {
		mixtureStore,
		id: parentId,
		name: mixtureName
	}: { mixtureStore: MixtureStore; id: string | null; name: string } = $props();

	let mixture = $derived(parentId ? mixtureStore.findMixture(parentId) : mixtureStore.mixture);

	// We need to manage open states externally and use the component's ID
	// as the key in the #each block to prevent Svelte from reusing
	// AccordionItem components when a component is removed. This ensures
	// that when we remove a component, its AccordionItem is properly
	// destroyed rather than being reused for the next component that
	// takes its place in the list.
	let openStates = $state(new Map<string, boolean>([['add-component', false]]));

	function setOpen(id: string, value: boolean) {
		if (value) {
			openStates.set(id, true);
		} else {
			openStates.delete(id);
		}
	}

	let editMode = $state(false);
	function toggleEditMode() {
		editMode = !editMode;
	}

	const btnClass = 'py-1 px-1.5 border-1 !justify-start gap-1';
</script>

{#snippet nameInput(ingredient: IngredientItem, basis = 'basis-3/4')}
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

{#snippet defaultHeader(ingredient: IngredientItem, volume: number)}
	<NumberSpinner
		{mixtureStore}
		class="basis-1/4"
		value={volume}
		type="volume"
		componentId={ingredient.id}
	/>

	{@render nameInput(ingredient, 'basis-3/4')}
{/snippet}

{#snippet sweetenerHeader(ingredient: IngredientItem, mass: number)}
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
	{@render nameInput(ingredient, 'basis-1/3')}
{/snippet}

{#snippet simpleSyrupHeader(ingredient: IngredientItem, volume: number, brix: number)}
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
	{@render nameInput(ingredient, 'basis-1/3')}
{/snippet}

{#snippet spiritHeader(ingredient: IngredientItem, volume: number, abv: number)}
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
	{@render nameInput(ingredient, 'basis-3/5')}
{/snippet}

{#snippet citrusHeader(ingredient: IngredientItem, volume: number)}
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
	{@render nameInput(ingredient, 'basis-1/2')}
{/snippet}

<div>
	<div class="flex flex-row justify-start items-center gap-3 mb-1.5 no-print">
		<Button isActive={editMode} class="py-1 px-4 border-1 !justify-start" onclick={toggleEditMode}>
			<span class="text-xs font-normal text-primary-500 dark:text-primary-400 leading-3"
				>Add/Remove</span
			>
		</Button>
		{#if parentId !== null}
			<Button
				class="py-1 px-1.5 border-1 !justify-start gap-1"
				onclick={() => mixture && (window.location.href = serializeToUrl(mixtureName, mixture))}
			>
				<span class="italic text-xs font-normal text-primary-500 dark:text-primary-400 leading-3"
					>Open a copy</span
				>
			</Button>
		{/if}
	</div>

	{#if editMode}
		<div class="flex flex-col items-stretch mt-1">
			<AddComponent
				{mixtureStore}
				componentId={parentId}
				callback={() => setOpen('add-component', false)}
			/>
		</div>
	{/if}

	{#if mixture}
		<Accordion flush={false} isSingle={false} class="mt-1">
			{#each mixture.eachIngredient() || [] as { ingredient, mass } (ingredient.id)}
				{@const id = ingredient.id}
				{@const component = ingredient.item}
				{@const volume = mixture.getIngredientVolume(id)}
				<AccordionItem
					class="py-2 pl-1 pr-2"
					open={openStates.get(id) ?? false}
					onclick={() => setOpen(id, !openStates.get(id))}
				>
					{#snippet header()}
						<div class="relative pt-2.5 flex flex-row items-center gap-x-1.5">
							<div class="absolute txt-xxs text-primary-500">{component.describe()}</div>
							{#if editMode}
								<RemoveButton
									{mixtureStore}
									componentId={id}
									name={ingredient.name}
									onRemove={() => openStates.delete(id)}
								/>
							{/if}

							{#if isSweetener(component)}
								{@render sweetenerHeader(ingredient, mass)}
							{:else if isSimpleSpirit(component)}
								{@render spiritHeader(
									ingredient,
									volume,
									mixture.getIngredientAbv(id)
								)}
							{:else if isSimpleSyrup(component)}
								{@render simpleSyrupHeader(
									ingredient,
									volume,
									mixture.getIngredientBrix(id)
								)}
								{:else if isCitrusMixture(component)}
								{@render citrusHeader(ingredient, volume)}
							<!-- {:else if isAcid(component)}
								{@render acidHeader(ingredient, mass)}
							{:else if isBuffer(component)}
								{@render bufferHeader(ingredient, mass)}
							{:else if isSalt(component)}
								{@render saltHeader(ingredient, mass)} -->
							{:else}
								{@render defaultHeader(ingredient, volume)}
							{/if}
						</div>
					{/snippet}
					<div class="flex flex-col items-stretch">
						{#if isSweetener(component)}
							<div class="flex flex-row my-1">
								<Mass
									{mixtureStore}
									componentId={id}
									{component}
									{mass}
									readonly={true}
									class="basis-1/4"
								/>
								<Volume
									{mixtureStore}
									componentId={id}
									{component}
									{mass}
									readonly={true}
									class="basis-1/5"
								/>
								<EquivalentSugar
									{mixtureStore}
									componentId={id}
									{component}
									{mass}
									readonly={true}
									class="basis-1/5"
								/>
								<Cal
									{mixtureStore}
									componentId={id}
									{component}
									{mass}
									readonly={true}
									class="basis-1/5"
								/>
							</div>
						{:else if isWater(component)}
							<div class="flex flex-row my-1">
								<Volume
									{mixtureStore}
									componentId={id}
									{component}
									{mass}
									readonly={true}
									class="basis-1/2"
								/>
								<Mass
									{mixtureStore}
									componentId={id}
									{component}
									{mass}
									readonly={true}
									class="basis-1/2"
								/>
							</div>
						{:else if isSimpleSpirit(component)}
							<div class="flex flex-row my-1">
								<Volume
									{mixtureStore}
									componentId={id}
									{component}
									{mass}
									readonly={true}
									class="basis-1/4"
								/>
								<Mass
									{mixtureStore}
									componentId={id}
									{component}
									{mass}
									readonly={true}
									class="basis-1/5"
								/>
								<Abv
									{mixtureStore}
									componentId={id}
									{component}
									{mass}
									readonly={true}
									class="basis-1/4"
								/>
								<Cal
									{mixtureStore}
									componentId={id}
									{component}
									{mass}
									readonly={true}
									class="basis-1/5"
								/>
							</div>
						{:else if isSimpleSyrup(component)}
							<div class="flex flex-row my-1">
								<Volume
									{mixtureStore}
									componentId={id}
									{component}
									{mass}
									readonly={true}
									class="basis-1/4"
								/>
								<Mass
									{mixtureStore}
									componentId={id}
									{component}
									{mass}
									readonly={true}
									class="basis-1/4"
								/>
								<Brix
									{mixtureStore}
									componentId={id}
									{component}
									{mass}
									readonly={true}
									class="basis-1/4"
								/>
								<Cal {mixtureStore} componentId={id} {component} {mass} readonly={true} />
							</div>
						{:else if isMixture(component)}
							<MixtureAccordion {mixtureStore} {id} name={ingredient.name} />
						{/if}
					</div>
				</AccordionItem>
			{/each}

			<!-- TOTALS -->
			<h2 class="group">
				<div class="items-center gap-x-2 gap-y-2">
					<div class="text-xs p-1 pt-2 text-primary-600">Totals ({mixtureName})</div>
					<div class="flex flex-row flex-wrap mb-1">
						<VolumeComponent
							{mixtureStore}
							componentId={parentId === null ? 'totals' : parentId}
							component={mixture}
							mass={mixture.mass}
							class="basis-1/6 min-w-20 grow-0"
						/>
						<ABVComponent
							{mixtureStore}
							componentId={parentId === null ? 'totals' : parentId}
							component={mixture}
							mass={mixture.mass}
							class="basis-1/6 min-w-20 grow-0"
						/>
						<BrixComponent
							{mixtureStore}
							componentId={parentId === null ? 'totals' : parentId}
							component={mixture}
							mass={mixture.mass}
							class="basis-1/6 min-w-20 grow-0"
						/>
						<MassComponent
							{mixtureStore}
							componentId={parentId === null ? 'totals' : parentId}
							component={mixture}
							mass={mixture.mass}
							class="basis-1/6 min-w-20 grow-0"
						/>
						<CalComponent
							{mixtureStore}
							componentId={parentId === null ? 'totals' : parentId}
							component={mixture}
							mass={mixture.mass}
							class="basis-1/6 min-w-20 grow-0"
						/>
						<Ph
							{mixtureStore}
							componentId={parentId === null ? 'totals' : parentId}
							component={mixture}
							mass={mixture.mass}
							class="basis-1/6 min-w-20 grow-0"
						/>
					</div>
				</div>
			</h2>
		</Accordion>
	{/if}
	{#if parentId === null}
		<!-- spacer to totals will scroll above the bottom nav -->
		<div class="mt-20"></div>
	{/if}
</div>

<style>
	/* Small label that appears above each accordion item */
	.txt-xxs {
		top: -7px;
		left: 2px;
		font-weight: 300;
		font-size: 0.65rem;
		line-height: 1rem;
	}

	/* Style the accordion button container to make room for the arrow
	   Using h2.group to match the exact structure from svelte-5-ui-lib */
	:global(h2.group button) {
		position: relative; /* Needed for absolute positioning of the arrow */
		padding-right: 1.5rem !important; /* Reserve fixed space for the arrow */
	}

	/* Position and size the arrow SVG consistently across all accordion items
	   The arrow is an SVG element directly inside the button */
	:global(h2.group button > svg) {
		position: absolute; /* Take it out of normal flow */
		right: 0.5rem; /* Fixed distance from right edge */
		top: 50%; /* Center vertically... */
		transform: translateY(-50%); /* ...with perfect centering */
		width: 0.75rem; /* Fixed size for consistency */
		height: 0.75rem;
		flex-shrink: 0; /* Prevent arrow from shrinking if space is tight */
	}

	@media print {
		.no-print {
			display: none;
		}
	}
</style>
