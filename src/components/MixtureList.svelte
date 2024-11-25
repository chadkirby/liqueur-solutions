<script lang="ts">
	import {
		Accordion,
		AccordionItem,
		accordionitem,
		Input,
		Label,
		Listgroup
	} from 'svelte-5-ui-lib';
	import { FileOutline } from 'flowbite-svelte-icons';
	import debounce from 'lodash.debounce';

	import { mixtureStore, Mixture, Sweetener, Water, isSpirit, isSyrup } from '$lib';
	import VolumeComponent from './Volume.svelte';
	import ABVComponent from './ABV.svelte';
	import BrixComponent from './Brix.svelte';
	import CalComponent from './Cal.svelte';
	import SweetenerDropdown from './SweetenerDropdown.svelte';
	import WaterDisplayGroup from './WaterDisplayGroup.svelte';
	import SweetenerDisplayGroup from './SweetenerDisplayGroup.svelte';
	import SpiritDisplayGroup from './SpiritDisplayGroup.svelte';
	import SyrupDisplayGroup from './SyrupDisplayGroup.svelte';
	import RemoveButton from './RemoveButton.svelte';
	import SaveButton from './SaveButton.svelte';
	import { getName, listFiles, type LocalStorageId } from '$lib/local-storage.js';
	import type { ChangeEventHandler } from 'svelte/elements';
	import { deserializeFromLocalStorage } from '$lib/deserialize.js';
	import { browser } from '$app/environment';

	interface Props {
		storeId: LocalStorageId;
	}

	let { storeId }: Props = $props();
	if (browser) {
		const mixture = deserializeFromLocalStorage(storeId);
		if (!mixture.isValid) throw new Error('Invalid mixture');
		const name = getName(storeId) || 'mixture';
		mixtureStore.load({ storeId, name, mixture });
	}

	// hack to remove accordion focus ring
	accordionitem.slots.active = accordionitem.slots.active.replace(/\S*focus:ring\S+/g, '');
	// hack to adjust accordion item padding
	accordionitem.variants.flush.false = {
		button: 'p-3 border-s border-e group-first:border-t',
		content: 'p-3 border-s border-e'
	};

	const handleTitleInput = () =>
	debounce<ChangeEventHandler<HTMLInputElement>>((event) => {
		const newName = (event.target as HTMLInputElement).value;
		mixtureStore.setName(newName);
		mixtureStore.save();
	}, 100);

	const selectFile = (e?: MouseEvent) => {
		if (e?.target instanceof HTMLElement) {
			const name = e.target.attributes.getNamedItem('name')?.value;
			if (name) {
				mixtureStore.setName(name);
			}
		}
	};
</script>

<div class="flex flex-col gap-x-2 gap-y-2">
	<Accordion flush={false} isSingle={false}>
		<AccordionItem class="py-2">
			{#snippet header()}
				<div
					class="
					flex flex-row
					items-center
					gap-x-2
					"
				>
					<SaveButton />

					<Label class="font-semibold">{$mixtureStore.name || 'untitled'}</Label>
				</div>
			{/snippet}
			<Input
				value={$mixtureStore.name}
				oninput={handleTitleInput()}
				placeholder="Name your mixture"
				required
				class="text-l font-bold mb-2"
			/>
			<Listgroup
				active
				items={listFiles({ Icon: FileOutline })}
				class="w-48"
				onclick={selectFile}
			/>
		</AccordionItem>

		{#each $mixtureStore.mixture.components.entries() as [index, { name, id, component: entry }] (index)}
			<AccordionItem class="py-2">
				{#snippet header()}
					<div class="flex flex-row items-center gap-x-2">
						<RemoveButton componentId={id} />
						<Label>{entry.describe()}</Label>
					</div>
				{/snippet}
				<div class="flex flex-col items-stretch">
					{#if entry instanceof Sweetener || isSyrup(entry)}
						<SweetenerDropdown componentId={id} component={entry} {name} />
					{:else}
						<Input
							value={name}
							class="w-full pr-8"
							oninput={(e) => mixtureStore.updateComponentName(id, e.currentTarget.value)}
						/>
					{/if}
					<div class="flex flex-row grow my-1">
						{#if entry instanceof Sweetener}
							<SweetenerDisplayGroup componentId={id} component={entry} />
						{:else if entry instanceof Water}
							<WaterDisplayGroup componentId={id} component={entry} />
						{:else if entry instanceof Mixture && isSpirit(entry)}
							<SpiritDisplayGroup componentId={id} component={entry} />
						{:else if entry instanceof Mixture && isSyrup(entry)}
							<SyrupDisplayGroup componentId={id} component={entry} />
						{/if}
					</div>
				</div>
			</AccordionItem>
		{/each}
	</Accordion>
</div>

<div class="mt-2 items-center pt-2 gap-x-2 gap-y-2">
	<h2
		class="
		col-span-4
		mb-2
		basis-full
		text-xl
		font-bold
	"
	>
		Totals
	</h2>
	<div class="flex flex-row">
		<VolumeComponent componentId="totals" component={$mixtureStore.mixture} />
		<ABVComponent componentId="totals" component={$mixtureStore.mixture} />
		<BrixComponent componentId="totals" component={$mixtureStore.mixture} />
		<CalComponent componentId="totals" component={$mixtureStore.mixture} />
	</div>
</div>

<style>
	:root {
		--screenGray: rgb(0 0 0 / 50%);
		--printGray: rgb(0 0 0 / 75%);
		--mdc-theme-primary: #676778;
		--mdc-theme-secondary: #676778;
	}

	@media print {
		.no-print {
			display: none;
		}
	}
</style>
