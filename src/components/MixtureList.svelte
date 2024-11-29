<script lang="ts">
	import {
		Accordion,
		AccordionItem,
		accordionitem,
		Button,
		Helper,
		Input,
		Label,
		Tooltip
	} from 'svelte-5-ui-lib';
	import { StarOutline, StarSolid } from 'flowbite-svelte-icons';
	import debounce from 'lodash.debounce';

	import { mixtureStore, Mixture, Sweetener, Water, isSimpleSpirit, isLiqueur, isSimpleSyrup } from '$lib';
	import VolumeComponent from './displays/Volume.svelte';
	import ABVComponent from './displays/ABV.svelte';
	import BrixComponent from './displays/Brix.svelte';
	import CalComponent from './displays/Cal.svelte';
	import MassComponent from './displays/Mass.svelte';
	import SweetenerDropdown from './displays/SweetenerDropdown.svelte';
	import WaterDisplayGroup from './displays/WaterDisplayGroup.svelte';
	import SweetenerDisplayGroup from './displays/SweetenerDisplayGroup.svelte';
	import SpiritDisplayGroup from './displays/SpiritDisplayGroup.svelte';
	import SyrupDisplayGroup from './displays/SyrupDisplayGroup.svelte';
	import RemoveButton from './RemoveButton.svelte';
	import {
		filesDb,
		generateLocalStorageId,
		getName,
		workingMixtureId,
		type LocalStorageId
	} from '$lib/local-storage.js';
	import type { ChangeEventHandler } from 'svelte/elements';
	import { deserializeFromLocalStorage } from '$lib/deserialize.js';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import MixtureAccordion from './MixtureAccordion.svelte';

	interface Props {
		storeId: LocalStorageId;
	}

	let { storeId }: Props = $props();
	let isWorking = $derived(storeId === workingMixtureId);

	if (browser) {
		$effect(() => {
			try {
				const mixture = deserializeFromLocalStorage(storeId);
				if (!mixture.isValid) throw new Error('Invalid mixture');
				const name = getName(storeId) || 'mixture';
				mixtureStore.load({ storeId, name, mixture });
			} catch (error) {
				goto('/new');
			}
		});
	}
	// hack to remove accordion focus ring
	accordionitem.slots.active = accordionitem.slots.active.replace(/\S*focus:ring\S+/g, '');
	// hack to adjust accordion item padding
	accordionitem.variants.flush.false = {
		button: 'p-2 border-s border-e group-first:border-t',
		content: 'p-2 border-s border-e'
	};

	const handleTitleInput = () =>
		debounce<ChangeEventHandler<HTMLInputElement>>((event) => {
			const newName = (event.target as HTMLInputElement).value;
			mixtureStore.setName(newName);
			mixtureStore.save();
		}, 100);

	function saveAndGo(id: LocalStorageId) {
		storeId = id;
		mixtureStore.setStoreId(id);
		goto(`/file?id=${id}`, { replaceState: true, invalidateAll: true });
	}

	function toggleStar(event?: Event) {
		event?.preventDefault();
		if (isWorking) {
			saveAndGo(generateLocalStorageId());
		} else {
			filesDb.delete(storeId);
			saveAndGo(workingMixtureId);
		}
	}
</script>

<div class="flex flex-col gap-x-2 gap-y-2">
	<div
		class="
					flex flex-row
					items-center
					gap-x-2
					"
	>
		<Button class="p-1" outline color="light" onclick={toggleStar}>
			{#if isWorking}
				<Tooltip color="default" offset={6} triggeredBy="#unsaved-star">
					This mixture is not saved
				</Tooltip>
				<StarOutline id="unsaved-star" />
			{:else}
				<Tooltip color="default" offset={6} triggeredBy="#saved-star">
					This mixture is saved
				</Tooltip>
				<StarSolid id="saved-star" />
			{/if}
		</Button>
		<div class="w-full">
			<Helper>Mixture name</Helper>
			<Input
				value={$mixtureStore.name}
				oninput={handleTitleInput()}
				placeholder="Name your mixture"
				autocomplete="off"
				required
				class="text-l font-bold mb-2"
			/>
		</div>
	</div>

	<Helper>Mixture components</Helper>
	<MixtureAccordion mixture={$mixtureStore.mixture} id={null} />
</div>

<div class="mt-2 items-center pt-2 gap-x-2 gap-y-2">
	<Helper>Mixture totals</Helper>
	<div class="flex flex-row mt-2">
		<VolumeComponent componentId="totals" component={$mixtureStore.mixture} />
		<MassComponent componentId="totals" component={$mixtureStore.mixture} />
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
