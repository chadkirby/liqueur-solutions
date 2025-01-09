<script lang="ts">
	import UserButton from 'clerk-sveltekit/client/UserButton.svelte';
	import SignedIn from 'clerk-sveltekit/client/SignedIn.svelte';
	import SignedOut from 'clerk-sveltekit/client/SignedOut.svelte';
	import {
		UserOutline,
		UserSolid,
	} from 'flowbite-svelte-icons';
	import { accordionitem, Tooltip } from 'svelte-5-ui-lib';
	import Button from './ui-primitives/Button.svelte';
	import Helper from './ui-primitives/Helper.svelte';
	import { StarOutline, StarSolid } from 'flowbite-svelte-icons';
	import debounce from 'lodash.debounce';

	import type { ChangeEventHandler } from 'svelte/elements';
	import MixtureAccordion from './MixtureAccordion.svelte';
	import { filesDb, starredIds } from '$lib/storage.svelte.js';
	import TextInput from './ui-primitives/TextInput.svelte';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';
	import SignInButton from 'clerk-sveltekit/client/SignInButton.svelte';
	import SignUpButton from 'clerk-sveltekit/client/SignUpButton.svelte';

	interface Props {
		mixtureStore: MixtureStore;
	}

	let { mixtureStore }: Props = $props();

	let storeId = $derived(mixtureStore.storeId);

	$inspect(mixtureStore);

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
		}, 100);

	let isStarred = $derived(starredIds.includes(storeId));

	function handleToggleStar(event?: Event) {
		event?.preventDefault();
		filesDb.toggleStar(storeId);
	}
</script>

<main class="flex flex-col gap-x-2 gap-y-2 mt-4" data-testid="mixture-list">
	<section
		class="
			flex flex-row
			items-center
			gap-x-2
			mb-2
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
		<div class="w-full relative">
			<Helper class="absolute left-0 -top-[67%] ">Mixture name</Helper>
			<TextInput
				value={mixtureStore.name}
				oninput={handleTitleInput()}
				placeholder="Name your mixture"
				class="text-l font-bold leading-normal"
			/>
		</div>

		<SignedIn>
			<UserButton afterSignOutUrl={window.location.href}></UserButton>
		</SignedIn>
		<SignedOut>
			<SignInButton class="rounded-full     text-center
    border
    border-primary-300
    dark:border-primary-400
    text-primary-900    font-medium
    text-sm
basis-1/4" mode="modal" />
			<SignUpButton class="rounded-full     text-center
    border
    border-primary-300
    dark:border-primary-400
    bg-white    font-medium
    text-sm
basis-1/4" mode="modal" />
		</SignedOut>

	</section>

	<MixtureAccordion {mixtureStore} id={null} name={mixtureStore.name} />
</main>

<style>
	:root {
		--screenGray: rgb(0 0 0 / 50%);
		--printGray: rgb(0 0 0 / 75%);
		--mdc-theme-primary: #676778;
		--mdc-theme-secondary: #676778;
	}
</style>
