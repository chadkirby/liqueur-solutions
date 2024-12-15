<script lang="ts">
	import {
		RedoOutline,
		UndoOutline,
		CirclePlusSolid,
		CircleMinusSolid,
		FileCopySolid
	} from 'flowbite-svelte-icons';
	import { isSimpleSpirit, isSimpleSyrup, Mixture, Sweetener, Water } from '$lib/index.svelte';
	import { Accordion, AccordionItem, Tooltip } from 'svelte-5-ui-lib';
	import SweetenerDropdown from './displays/SweetenerDropdown.svelte';
	import WaterDisplayGroup from './displays/WaterDisplayGroup.svelte';
	import SweetenerDisplayGroup from './displays/SweetenerDisplayGroup.svelte';
	import SpiritDisplayGroup from './displays/SpiritDisplayGroup.svelte';
	import SyrupDisplayGroup from './displays/SyrupDisplayGroup.svelte';
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
	import { MixtureStore, urlEncode } from '$lib/mixture-store.svelte.js';
	import { goto } from '$app/navigation';

	let {
		mixtureStore,
		id: parentId,
		name
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

<div>
	<div class="flex flex-row justify-start items-center gap-3 mb-1.5 no-print">
		<Button isActive={editMode} class={btnClass} onclick={toggleEditMode}>
			<CirclePlusSolid class="text-primary-500" />
			<CircleMinusSolid class="text-primary-500" />
		</Button>
		{#if mixture}
			<button
				id="copy-button"
				aria-label="Open Copy"
				class={btnClass}
				onclick={() => goto(urlEncode(name, mixture))}
			>
				<FileCopySolid class="text-primary-500" />
			</button>
		{/if}
	</div>

	{#if editMode}
		<div class="flex flex-col items-stretch mt-1">
			<AddComponent {mixtureStore} componentId={parentId} callback={() => setOpen('add-component', false)} />
		</div>
	{/if}

	<Accordion flush={false} isSingle={false} class="mt-1">
		{#each mixture?.components || [] as { name, id, component: entry } (id)}
			<AccordionItem
				class="py-2 pl-1 pr-2"
				open={openStates.get(id) ?? false}
				onclick={() => setOpen(id, !openStates.get(id))}
			>
				{#snippet header()}
					<div class="relative pt-2.5 flex flex-row items-center gap-x-1.5">
						<div class="absolute txt-xxs text-primary-500">{entry.describe()}</div>
						{#if editMode}
							<RemoveButton
								{mixtureStore}
								componentId={id}
								{name}
								onRemove={() => openStates.delete(id)}
							/>
						{/if}

						{#if entry instanceof Sweetener}
							<NumberSpinner
								{mixtureStore}
								class="basis-1/5"
								value={entry.mass}
								type="mass"
								componentId={id}
							/>
						{:else}
							<NumberSpinner
								{mixtureStore}
								class="basis-1/5"
								value={entry.volume}
								type="volume"
								componentId={id}
							/>
						{/if}

						{#if isSimpleSpirit(entry)}
							<Tooltip color="default" offset={6} triggeredBy={`#edit-abv-${id}`}>ABV</Tooltip>
							<NumberSpinner
								{mixtureStore}
								id={`edit-abv-${id}`}
								class="basis-1/6"
								value={entry.abv}
								type="abv"
								componentId={id}
							/>
						{/if}
						{#if isSimpleSyrup(entry)}
							<Tooltip color="default" offset={6} triggeredBy={`#edit-brix-${id}`}>
								Sweetness
							</Tooltip>
							<NumberSpinner
								{mixtureStore}
								id={`edit-brix-${id}`}
								class="basis-1/6"
								value={entry.brix}
								type="brix"
								componentId={id}
							/>
						{/if}

						{#if entry instanceof Sweetener || isSimpleSyrup(entry)}
							<SweetenerDropdown
								{mixtureStore}
								componentId={id}
								component={entry}
								basis="basis-1/3"
								onclick={(e) => e.stopPropagation()}
							/>
						{/if}
						<TextInput
							type="text"
							value={name}
							placeholder={entry.describe()}
							class="
								mr-2
								{entry instanceof Sweetener || isSimpleSyrup(entry)
								? 'basis-1/3'
								: isSimpleSpirit(entry)
									? 'basis-1/2'
									: 'basis-3/4'}
								text-sm
								leading-[18px]
								focus:ring-2
								focus:border-blue-200
								focus:ring-blue-200
								"
							onclick={(e) => e.stopPropagation()}
							oninput={(e) => mixtureStore.updateComponentName(id, e.currentTarget.value)}
						/>
					</div>
				{/snippet}
				<div class="flex flex-col items-stretch">
					{#if entry instanceof Sweetener}
						<SweetenerDisplayGroup componentId={id} component={entry} />
					{:else if entry instanceof Water}
						<WaterDisplayGroup componentId={id} component={entry} />
					{:else if isSimpleSpirit(entry)}
						<SpiritDisplayGroup componentId={id} component={entry} />
					{:else if isSimpleSyrup(entry)}
						<SyrupDisplayGroup componentId={id} component={entry} />
					{:else if entry instanceof Mixture}
						<MixtureAccordion {mixtureStore} {id} {name} />
					{/if}
				</div>
			</AccordionItem>
		{/each}
		<h2 class="group">
			<div class="items-center gap-x-2 gap-y-2">
				<div class="text-xs p-1 pt-2 text-primary-600">Totals ({name})</div>
				<div class="flex flex-row flex-wrap mb-1">
					<VolumeComponent
						{mixtureStore}
						componentId={parentId === null ? 'totals' : parentId}
						component={mixture}
						class="basis-1/6 min-w-20 grow-0"
					/>
					<ABVComponent
						{mixtureStore}
						componentId={parentId === null ? 'totals' : parentId}
						component={mixture}
						class="basis-1/6 min-w-20 grow-0"
					/>
					<BrixComponent
						{mixtureStore}
						componentId={parentId === null ? 'totals' : parentId}
						component={mixture}
						class="basis-1/6 min-w-20 grow-0"
					/>
					<MassComponent
						{mixtureStore}
						componentId={parentId === null ? 'totals' : parentId}
						component={mixture}
						class="basis-1/6 min-w-20 grow-0"
					/>
					<CalComponent
						{mixtureStore}
						componentId={parentId === null ? 'totals' : parentId}
						component={mixture}
						class="basis-1/6 min-w-20 grow-0"
					/>
				</div>
			</div>
		</h2>
	</Accordion>
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
