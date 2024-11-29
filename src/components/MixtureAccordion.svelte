<script lang="ts">
	import {
		isLiqueur,
		isSimpleSpirit,
		isSimpleSyrup,
		mixtureStore,
		Mixture,
		Sweetener,
		Water
	} from '$lib';
	import { A, Accordion, AccordionItem, Button, Input, Label } from 'svelte-5-ui-lib';
	import SweetenerDropdown from './displays/SweetenerDropdown.svelte';
	import WaterDisplayGroup from './displays/WaterDisplayGroup.svelte';
	import SweetenerDisplayGroup from './displays/SweetenerDisplayGroup.svelte';
	import SpiritDisplayGroup from './displays/SpiritDisplayGroup.svelte';
	import SyrupDisplayGroup from './displays/SyrupDisplayGroup.svelte';
	import RemoveButton from './RemoveButton.svelte';
	import MixtureAccordion from './MixtureAccordion.svelte';
	import NumberSpinner from './NumberSpinner.svelte';
	import { format } from '$lib/utils.js';
	import { CirclePlusSolid } from 'flowbite-svelte-icons';
	import AddComponent from './nav/AddComponent.svelte';

	let { mixture, id: parentId }: { mixture: Mixture, id: string | null} = $props();
</script>

<Accordion flush={false} isSingle={false}>
	{#each mixture.components.entries() as [index, { name, id, component: entry }] (index)}
		<AccordionItem class="py-2">
			{#snippet header()}
				<div class="flex flex-row items-center gap-x-2">
					<RemoveButton componentId={id} {name} />
					{#if entry instanceof Sweetener}
						<NumberSpinner
							class="basis-1/5"
							value={entry.mass}
							format={(v) => `${format(v, { unit: 'g' })}`}
							onValueChange={(m) => mixtureStore.setMass(id, m)}
						/>
					{:else}
						<NumberSpinner
							class="basis-1/5"
							value={entry.volume}
							format={(v) => `${format(v, { unit: 'ml' })}`}
							onValueChange={(v) => mixtureStore.setVolume(id, v)}
						/>
					{/if}
					{#if isSimpleSpirit(entry)}
						<NumberSpinner
							class="basis-1/5"
							value={entry.abv}
							format={(v) => `${format(v, { unit: '%' })}`}
							onValueChange={(a) => mixtureStore.setAbv(id, a)}
						/>
					{/if}

					<Label>{entry.describe()}</Label>
				</div>
			{/snippet}
			<div class="flex flex-col items-stretch">
				{#if entry instanceof Sweetener || isSimpleSyrup(entry)}
					<SweetenerDropdown componentId={id} component={entry} {name} />
				{:else if isSimpleSpirit(entry) || isLiqueur(entry)}
					<Input
						value={name}
						class="w-full pr-8"
						oninput={(e) => mixtureStore.updateComponentName(id, e.currentTarget.value)}
					/>
				{/if}
				<div class="flex flex-row my-1">
					{#if entry instanceof Sweetener}
						<SweetenerDisplayGroup componentId={id} component={entry} />
					{:else if entry instanceof Water}
						<WaterDisplayGroup componentId={id} component={entry} />
					{:else if isSimpleSpirit(entry)}
						<SpiritDisplayGroup componentId={id} component={entry} />
					{:else if isSimpleSyrup(entry)}
						<SyrupDisplayGroup componentId={id} component={entry} />
					{:else if entry instanceof Mixture}
						<MixtureAccordion mixture={entry} {id} />
					{/if}
				</div>
			</div>
		</AccordionItem>
	{/each}
	<AccordionItem class="py-2">
		{#snippet header()}
			<div class="flex flex-row items-center gap-x-2">
				<Button outline color="light" class="p-1"><CirclePlusSolid size="sm" /></Button>
				<Label class="italic">Add a component…</Label>
			</div>
		{/snippet}
		<div class="flex flex-col items-stretch">
			<AddComponent componentId={parentId} />
		</div>
	</AccordionItem>
</Accordion>
