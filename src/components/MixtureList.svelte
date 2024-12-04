<script lang="ts">
	import { accordionitem, Input, Tooltip } from 'svelte-5-ui-lib';
	import Button from './ui-primitives/Button.svelte';
	import Helper from './ui-primitives/Helper.svelte';
	import { StarOutline, StarSolid } from 'flowbite-svelte-icons';
	import debounce from 'lodash.debounce';

	import { mixtureStore } from '$lib';
	import type { ChangeEventHandler } from 'svelte/elements';
	import { goto } from '$app/navigation';
	import MixtureAccordion from './MixtureAccordion.svelte';
	import type { StorageId } from '$lib/storage-id.js';
	import { starredIds, toggleStar } from '$lib/stars.svelte.js';

	interface Props {
		storeId: StorageId;
	}

	let { storeId }: Props = $props();

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

	function saveAndGo(id: StorageId) {
		// storeId = id;
		// mixtureStore.setStoreId(id);
		goto(`/file${id}`, { replaceState: true, invalidateAll: true });
	}

	let isStarred = $derived(starredIds.includes(storeId));

	function handleToggleStar(event?: Event) {
		event?.preventDefault();
		toggleStar(storeId);
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
		<Button onclick={handleToggleStar}>
			{#if isStarred}
				<Tooltip color="default" offset={6} triggeredBy="#saved-star">
					This mixture is saved
				</Tooltip>
				<StarSolid id="saved-star" />
			{:else}
				<Tooltip color="default" offset={6} triggeredBy="#unsaved-star">
					This mixture is not saved
				</Tooltip>
				<StarOutline id="unsaved-star" />
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

	<MixtureAccordion mixture={$mixtureStore.mixture} id={null} name={$mixtureStore.name} />
</div>

<style>
	:root {
		--screenGray: rgb(0 0 0 / 50%);
		--printGray: rgb(0 0 0 / 75%);
		--mdc-theme-primary: #676778;
		--mdc-theme-secondary: #676778;
	}
</style>
