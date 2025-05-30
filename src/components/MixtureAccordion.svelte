<script lang="ts">
	import { Accordion, AccordionItem } from 'svelte-5-ui-lib';
	import RemoveButton from './RemoveButton.svelte';
	import MixtureAccordion from './MixtureAccordion.svelte';
	import AddComponent from './nav/AddComponent.svelte';
	import Button from './ui-primitives/Button.svelte';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';
	import { serializeToUrl } from '$lib/url-serialization.js';
	import {
		isMixture,
		isSweetener,
		isWater,
		isCitrusMixture as _isCitrusMixture,
		isAcidSubstance as _isAcidSubstance,
		isSpirit,
		isSyrup,
		isSubstance,
	} from '$lib/mixture.js';
	import {
		defaultHeader,
		sweetenerHeader,
		simpleSyrupHeader,
		spiritHeader,
		citrusHeader,
		acidHeader,
		saltHeader,
	} from './IngredientHeaders.svelte';
	import {
		saltDetails,
		sweetenerDetails,
		defaultDetails,
		spiritDetails,
		syrupDetails,
		acidDetails,
		citrusDetails,
	} from './IngredientDetails.svelte';
	import type {
		InMemoryIngredient,
		InMemoryMixture,
		InMemorySubstance,
	} from '$lib/mixture-types.js';
	import Helper from './ui-primitives/Helper.svelte';
	import { ingredientTotals, mixtureTotals } from './MixtureTotals.svelte';
	import { isSaltId } from '$lib/ingredients/substances.js';

	let {
		mixtureStore,
		id: parentId,
		name: mixtureName,
	}: { mixtureStore: MixtureStore; id: string; name: string } = $props();

	let mixture = $derived(parentId ? mixtureStore.findMixture(parentId) : mixtureStore.mixture);

	// We need to manage open states externally and use the component's ID
	// as the key in the #each block to prevent Svelte from reusing
	// AccordionItem components when a component is removed. This ensures
	// that when we remove a component, its AccordionItem is properly
	// destroyed rather than being reused for the next component that
	// takes its place in the list.
	let openStates = $state(new Map<string, boolean>());

	function setOpen(id: string, value: boolean) {
		if (value) {
			openStates.set(id, true);
		} else {
			openStates.delete(id);
		}
	}

	// svelte-ignore state_referenced_locally
	let editMode = $state(mixture?.size === 0);
	function toggleEditMode() {
		editMode = !editMode;
	}

	let editMixtureDialog: HTMLDialogElement | null = $state(null);
	let editedSubmixture = $state({ id: '', name: '' });
	let displayName = $derived(mixtureName || mixture?.describe() || 'never');

	function isSimpleSpirit(thing: InMemoryIngredient): thing is InMemoryMixture {
		return isSpirit(thing.item) && thing.item.size === 2 && thing.item.substances.length === 2;
	}

	function isSimpleSyrup(thing: InMemoryIngredient): thing is InMemoryMixture {
		// simple syrup is a mixture of sweetener and water
		return Boolean(
			isMixture(thing.item) &&
				isSyrup(thing.item) &&
				thing.item.size === 2 &&
				thing.item.substances.length === 2,
		);
	}

	function isAcidSubstance(thing: InMemoryIngredient): thing is InMemorySubstance {
		return isSubstance(thing.item) && _isAcidSubstance(thing.item);
	}
	function isCitrusMixture(thing: InMemoryIngredient): thing is InMemoryMixture {
		return isMixture(thing.item) && _isCitrusMixture(thing.item);
	}
	function isSaltIngredient(thing: InMemoryIngredient): thing is InMemorySubstance {
		return isSubstance(thing) && isSaltId(thing.substanceId);
	}
</script>

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
				onclick={() =>
					mixture && (window.location.href = serializeToUrl(mixtureName, mixture).toString())}
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
				callback={(addedId) => {
					const newIngredient = mixture?.getIngredient(addedId);
					if (newIngredient && isMixture(newIngredient.item) && newIngredient.item.size === 0) {
						editedSubmixture = {
							id: addedId,
							name: newIngredient.name || newIngredient.item.describe(),
						};
						editMixtureDialog?.showModal();
					}
				}}
			/>
		</div>
	{/if}

	{#if mixture}
		<Accordion flush={false} isSingle={false} class="mt-1">
			{#each mixture.eachIngredient() || [] as { ingredient, mass }, i (ingredient.id)}
				{@const id = ingredient.id}
				{@const ingredientVolume = mixture.getIngredientVolume(id)}
				<AccordionItem
					class="py-2 pl-1 pr-2"
					open={editMode ? false : (openStates.get(id) ?? false)}
					onclick={() => setOpen(id, !openStates.get(id))}
				>
					{#snippet header()}
						<div
							class="relative pt-2.5 flex flex-row items-center gap-x-1.5 w-full"
							data-testid="mixture-ingredient-accordion-header"
						>
							<div class="absolute txt-xxs text-primary-500">{ingredient.item.describe()}</div>
							{#if editMode}
								<RemoveButton
									{mixtureStore}
									componentId={id}
									name={ingredient.name}
									onRemove={() => openStates.delete(id)}
								/>
							{/if}

							{#if isSweetener(ingredient.item)}
								{@render sweetenerHeader(mixtureStore, ingredient, mass)}
							{:else if isSimpleSpirit(ingredient)}
								{@render spiritHeader(
									mixtureStore,
									ingredient,
									ingredientVolume,
									mixture.getIngredientAbv(id),
								)}
							{:else if isSimpleSyrup(ingredient)}
								{@render simpleSyrupHeader(
									mixtureStore,
									ingredient,
									ingredientVolume,
									mixture.getIngredientBrix(id),
								)}
							{:else if isCitrusMixture(ingredient)}
								{@render citrusHeader(mixtureStore, ingredient, ingredientVolume)}
							{:else if isAcidSubstance(ingredient)}
								{@render acidHeader(mixtureStore, ingredient, mass)}
							{:else if isSaltIngredient(ingredient)}
								{@render saltHeader(mixtureStore, ingredient, mass)}
							{:else}
								{@render defaultHeader(mixtureStore, ingredient, ingredientVolume)}
							{/if}
						</div>
					{/snippet}
					<div
						class="flex flex-wrap relative ml-4 gap-1.5 sm:gap-2"
						data-testid="mixture-ingredient-accordion-details"
					>
						<span
							class={[
								'absolute',
								'w-4',
								'h-10',
								'-left-4',
								'-top-2',
								'border-l-2',
								'border-b-2',
								'border-solid',
								'border-primary-400',
							]}
						></span>
						{#if isSweetener(ingredient.item)}
							{@render sweetenerDetails(mixtureStore, ingredient, mass, ingredientVolume)}
						{:else if isWater(ingredient.item)}
							{@render defaultDetails(mixtureStore, ingredient, mass, ingredientVolume)}
						{:else if isSimpleSpirit(ingredient)}
							{@render spiritDetails(mixtureStore, ingredient, mass, ingredientVolume)}
						{:else if isSimpleSyrup(ingredient)}
							{@render syrupDetails(mixtureStore, ingredient, mass, ingredientVolume)}
						{:else if isCitrusMixture(ingredient)}
							{@render citrusDetails(mixtureStore, ingredient, mass)}
						{:else if isMixture(ingredient.item)}
							{@render ingredientTotals(
								mixtureStore,
								ingredient.item,
								parentId,
								'min-w-16 max-w-24',
							)}
						{:else if isAcidSubstance(ingredient)}
							{@render acidDetails(
								mixtureStore,
								ingredient as InMemorySubstance,
								mass,
								ingredientVolume,
							)}
						{:else if isSaltIngredient(ingredient)}
							{@render saltDetails(mixtureStore, ingredient, mass, ingredientVolume)}
						{:else}
							{@render defaultDetails(mixtureStore, ingredient, mass, ingredientVolume)}
						{/if}
						{#if isMixture(ingredient.item)}
							<div class="min-w-16 max-w-24">
								<!-- need a dummy helper to align the button with other items in totals -->
								<Helper>{'\u00A0'}</Helper>
								<Button
									onclick={() => {
										editedSubmixture = {
											id,
											name: ingredient.name || ingredient.item.describe(),
										};
										editMixtureDialog?.showModal();
									}}
									class="w-full"
								>
									<span class="text-primary-500 dark:text-primary-400">Edit</span>
								</Button>
							</div>
						{/if}
					</div>
				</AccordionItem>
			{/each}

			<AccordionItem
				class="py-2 pl-1 pr-2"
				open={openStates.get('totals') ?? false}
				onclick={() => setOpen('totals', !openStates.get('totals'))}
			>
				{#snippet header()}
					<div class="items-center w-full">
						<div class="text-sm pb-2 text-primary-600">Totals ({displayName})</div>
						<div
							class="flex flex-row flex-wrap mb-1 gap-x-0.5 sm:gap-x-1 gap-y-2"
							data-testid="mixture-totals"
						>
							{@render mixtureTotals(mixtureStore, mixture)}
						</div>
					</div>
				{/snippet}
				<!-- Insert the substance map as a table -->
				<table
					class={['totals-substance-map', 'w-full', 'text-primary-600', 'dark:text-primary-400']}
				>
					<thead>
						<tr class={['text-right', 'text-xs', 'sm:text-sm', 'font-semibold']}>
							<th class="text-left pl-2">Substance</th>
							<th>Mass</th>
							<th>Mass%</th>
							<th>Vol</th>
							<th class="pr-2">Vol%</th>
						</tr>
					</thead>
					<tbody>
						{#each mixture.makeSubstanceMap(true) as [substanceId, { mass, item }]}
							{@const volume = item.getVolume(mass)}
							{@const massPct = (mass / mixture.mass) * 100}
							{@const volumePct = (volume / mixture.volume) * 100}
							{@const tdClass = ['pt-2', 'text-right', 'font-mono', 'text-xs', 'sm:text-sm']}
							<tr class={['border-t-2', 'border-primary-200', 'dark:border-primary-800']}>
								<td class={['!font-sans', '!text-left', 'pl-2', 'text-sm']}>{substanceId}</td>
								<td class={tdClass}>{mass.toFixed(1)}<span>g</span></td>
								{#if massPct >= 0.1}
									<td class={tdClass}>{massPct.toFixed(1)}<span>%</span></td>
								{:else}
									<td class={tdClass}>{(massPct * 10000).toFixed(0)}<span>ppm</span></td>
								{/if}
								<td class={tdClass}>{volume.toFixed(1)}<span>ml</span></td>
								{#if volumePct >= 0.1}
									<td class={[tdClass, 'pr-2']}>{volumePct.toFixed(1)}<span>%</span></td>
								{:else}
									<td class={[tdClass, 'pr-2']}>{(volumePct * 10000).toFixed(0)}<span>ppm</span></td
									>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</AccordionItem>
		</Accordion>
	{/if}
</div>

<dialog
	bind:this={editMixtureDialog}
	onclose={() => {
		editedSubmixture = { id: '', name: '' };
		// Force the parent component to re-evaluate its mixture
		mixtureStore = mixtureStore;
	}}
>
	<div class="h-[90vh] w-[90vw] max-w-2xl relative overflow-hidden">
		<div
			class="sticky top-0 left-0 right-0 bg-white z-10 flex gap-2 justify-between items-center p-2 border-b border-primary-100"
		>
			<span class="text-sm font-semibold text-primary-600">Editing {editedSubmixture.name}</span>
			<Button onclick={() => editMixtureDialog?.close()}>Done</Button>
		</div>
		{#if editedSubmixture.id}
			<div class="p-2 h-full overflow-y-auto">
				<MixtureAccordion {mixtureStore} id={editedSubmixture.id} name={editedSubmixture.name} />
			</div>
		{/if}
	</div>
</dialog>

<style>
	/* Small label that appears above each accordion item */
	.txt-xxs {
		top: -7px;
		left: 2px;
		font-weight: 300;
		font-size: 0.65rem;
		line-height: 1rem;
	}

	table.totals-substance-map {
		td > span:last-child {
			/* style unit values */
			margin-left: 0.1rem;
		}
	}

	/* Style the accordion button container to make room for the arrow
	   Using h2.group to match the exact structure from svelte-5-ui-lib */
	:global(h2.group > button) {
		position: relative; /* Needed for absolute positioning of the arrow */
		padding-right: 1.5rem !important; /* Reserve fixed space for the arrow */
	}

	/* Position and size the arrow SVG consistently across all accordion items
	   The arrow is an SVG element directly inside the button */
	:global(h2.group > button > svg) {
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
