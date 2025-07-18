<script lang="ts">
	import { accordionitem, Tooltip } from 'svelte-5-ui-lib';
	import Button from './ui-primitives/Button.svelte';
	import Helper from './ui-primitives/Helper.svelte';
	import { StarOutline, StarSolid } from 'flowbite-svelte-icons';
	import debounce from 'lodash.debounce';

	import type { ChangeEventHandler } from 'svelte/elements';
	import MixtureAccordion from './MixtureAccordion.svelte';
	import TextInput from './ui-primitives/TextInput.svelte';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';

	import AuthButtons from './AuthButtons.svelte';
	import { persistenceContext } from '$lib/persistence.js';

	interface Props {
		mixtureStore: MixtureStore;
	}

	let { mixtureStore }: Props = $props();

	let storeId = $derived(mixtureStore.storeId);

	// hack to remove accordion focus ring
	accordionitem.slots.active = accordionitem.slots.active.replace(/\S*focus:ring\S+/g, '');
	// hack to adjust accordion item padding
	accordionitem.variants.flush.false = {
		button: 'p-2 border-s border-e group-first:border-t',
		content: 'p-2 border-s border-e',
	};

	const handleTitleInput = () =>
		debounce<ChangeEventHandler<HTMLInputElement>>((event) => {
			const newName = (event.target as HTMLInputElement).value;
			mixtureStore.setName(newName);
		}, 100);

	let isStarred = $derived(
		persistenceContext.mixtureFiles?.findOne({ id: storeId }, { fields: { starred: 1 } })
			?.starred ?? false,
	);

	async function handleStar(event?: Event) {
		event?.preventDefault();
		persistenceContext.toggleStar(storeId);
	}
</script>

<main class="flex flex-col gap-x-2 gap-y-2 mt-4 mb-20" data-testid="mixture-list">
	<section
		class="
			flex flex-row
			items-center
			gap-x-2
			mb-2
			"
	>
		<Button onclick={handleStar}>
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
		<div class="w-full relative">
			<Helper class="absolute left-0 -top-[67%] ">Mixture name</Helper>
			<TextInput
				value={mixtureStore.name}
				oninput={handleTitleInput()}
				placeholder="Name your mixture"
				class="text-l font-bold leading-normal"
			/>
		</div>

		<AuthButtons />
	</section>

	<MixtureAccordion {mixtureStore} id={mixtureStore.mixture.id} name={mixtureStore.name} />
</main>

<style>
	:root {
		--screenGray: rgb(0 0 0 / 50%);
		--printGray: rgb(0 0 0 / 75%);
		--mdc-theme-primary: #676778;
		--mdc-theme-secondary: #676778;
	}
</style>
