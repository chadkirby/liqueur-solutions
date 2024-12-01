<script lang="ts">
	import { isSimpleSpirit, isSimpleSyrup, mixtureStore, Mixture, Sweetener, Water } from '$lib';
	import { Accordion, AccordionItem, Input } from 'svelte-5-ui-lib';
	import SweetenerDropdown from './displays/SweetenerDropdown.svelte';
	import WaterDisplayGroup from './displays/WaterDisplayGroup.svelte';
	import SweetenerDisplayGroup from './displays/SweetenerDisplayGroup.svelte';
	import SpiritDisplayGroup from './displays/SpiritDisplayGroup.svelte';
	import SyrupDisplayGroup from './displays/SyrupDisplayGroup.svelte';
	import RemoveButton from './RemoveButton.svelte';
	import MixtureAccordion from './MixtureAccordion.svelte';
	import NumberSpinner from './NumberSpinner.svelte';
	import { format } from '$lib/utils.js';
	import { CircleMinusSolid, CirclePlusSolid } from 'flowbite-svelte-icons';
	import AddComponent from './nav/AddComponent.svelte';
	import VolumeComponent from './displays/Volume.svelte';
	import ABVComponent from './displays/ABV.svelte';
	import BrixComponent from './displays/Brix.svelte';
	import CalComponent from './displays/Cal.svelte';
	import MassComponent from './displays/Mass.svelte';
	import Button from './ui-primitives/Button.svelte';

	let {
		mixture,
		id: parentId,
		name
	}: { mixture: Mixture; id: string | null; name: string } = $props();
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

	let addMode = $state(false);
	let removeMode = $state(false);
	function toggleRemoveMode() {
		addMode = false;
		removeMode = !removeMode;
	}
	function toggleAddMode() {
		addMode = !addMode;
		removeMode = false;
	}
</script>

<div class="flex flex-row justify-between gap-2">
	<div class="basis-1/3 two-lines-max text-xs font-normal text-slate-500 dark:text-slate-400">
		Components ({name})
	</div>
	<Button
		onclick={toggleAddMode}
		isActive={addMode}
		class="basis-1/4 py-0 flex flex-row gap-1"
	>
		<CirclePlusSolid size="sm" />
		<span class="italic text-sm text-slate-500">Add…</span>
	</Button>
	<Button
    isActive={removeMode}
		class="basis-1/4 py-0 flex flex-row gap-1"
		onclick={toggleRemoveMode}
	>
		<CircleMinusSolid size="sm" />
		<span class="italic text-sm text-slate-500">Remove…</span>
	</Button>
</div>

{#if addMode}
	<div class="flex flex-col items-stretch mt-1">
		<AddComponent componentId={parentId} callback={() => setOpen('add-component', false)} />
	</div>
{/if}

<Accordion flush={false} isSingle={false} class="mt-1">
	{#each mixture.components.entries() as [index, { name, id, component: entry }] (id)}
		<AccordionItem
			class="py-2"
			open={openStates.get(id) ?? false}
			onclick={() => setOpen(id, !openStates.get(id))}
		>
			{#snippet header()}
				<div class="relative pt-2.5 flex flex-row items-center gap-x-1.5">
					<div class="absolute txt-xxs text-slate-500">{entry.describe()}</div>

					{#if removeMode}
						<RemoveButton componentId={id} {name} onRemove={() => openStates.delete(id)} />
					{/if}
					{#if entry instanceof Sweetener}
						<NumberSpinner
							class="basis-1/5"
							value={entry.mass}
							type="mass"
							componentId={id}
						/>
					{:else}
						<NumberSpinner
							class="basis-1/5"
							value={entry.volume}
							type="volume"
							componentId={id}
						/>
					{/if}
					{#if isSimpleSpirit(entry)}
						<NumberSpinner
							class="basis-1/5"
							value={entry.abv}
							type="abv"
							componentId={id}
						/>
					{/if}

					{#if entry instanceof Sweetener || isSimpleSyrup(entry)}
						<SweetenerDropdown
							componentId={id}
							component={entry}
							basis="basis-1/2"
							onclick={(e) => e.stopPropagation()}
						/>
					{/if}
					<Input
						type="text"
						value={name}
						class="
             mr-2
             {entry instanceof Sweetener || isSimpleSyrup(entry)
							? 'basis-1/3'
							: isSimpleSpirit(entry)
								? 'basis-1/2'
								: 'basis-3/4'}
             text-sm
             px-1.5 py-1.5
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
					<MixtureAccordion mixture={entry} {id} {name} />
				{/if}
			</div>
		</AccordionItem>
	{/each}
	<h2 class="group">
		<div class="items-center gap-x-2 gap-y-2">
			<div class="text-sm p-2 font-medium text-slate-600">{name} totals</div>
			<div class="flex flex-row">
				<VolumeComponent
					componentId={parentId === null ? 'totals' : parentId}
					component={mixture}
				/>
				<MassComponent componentId={parentId === null ? 'totals' : parentId} component={mixture} />
				<ABVComponent componentId={parentId === null ? 'totals' : parentId} component={mixture} />
				<BrixComponent componentId={parentId === null ? 'totals' : parentId} component={mixture} />
				<CalComponent componentId={parentId === null ? 'totals' : parentId} component={mixture} />
			</div>
		</div>
	</h2>
</Accordion>
{#if parentId === null}
	<!-- spacer to totals will scroll above the bottom nav -->
	<div class="mt-20"></div>
{/if}

<style>
	.txt-xxs {
		top: -7px;
		left: 2px;
		font-weight: 300;
		font-size: 0.65rem;
		line-height: 1rem;
	}

	.two-lines-max {
		line-height: 0.8rem;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media print {
		.no-print {
			display: none;
		}
	}
</style>
