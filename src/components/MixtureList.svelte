<script lang="ts">
	import { accordionitem, Tooltip } from 'svelte-5-ui-lib';
	import Button from './ui-primitives/Button.svelte';
	import Helper from './ui-primitives/Helper.svelte';
	import { StarOutline, StarSolid, StarHalfStrokeSolid } from 'flowbite-svelte-icons';
	import debounce from 'lodash.debounce';

	import type { ChangeEventHandler } from 'svelte/elements';
	import MixtureAccordion from './MixtureAccordion.svelte';
	import TextInput from './ui-primitives/TextInput.svelte';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';

	import { getContext } from 'svelte';
	import { CLERK_CONTEXT_KEY, type ClerkContext } from '$lib/contexts.js';
	import { writeCloudFile, toggleStar, CloudFiles } from '$lib/persistence.svelte.js';

	interface Props {
		mixtureStore: MixtureStore;
	}

	let { mixtureStore }: Props = $props();

	// Get Clerk stores from context
	const clerkStores = getContext<ClerkContext>(CLERK_CONTEXT_KEY);
	const clerkInstance = clerkStores.instance; // Get the store itself
	const clerkUser = clerkStores.user; // Get the store itself

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

	let cloudSyncMeta = $derived(CloudFiles?.findOne({ id: storeId }));

	let isStarred = $derived(Boolean(cloudSyncMeta));
	let isDirty = $derived(mixtureStore.ingredientHash !== cloudSyncMeta?._ingredientHash);

	async function handleStar(event?: Event) {
		event?.preventDefault();
		if (isStarred && isDirty) {
			await writeCloudFile(storeId);
		} else {
			await toggleStar(storeId);
		}
	}

	function handleSignIn() {
		// Pass redirect URL options if needed, check ClerkJS docs
		$clerkInstance?.openSignIn({});
	}

	function handleSignUp() {
		$clerkInstance?.openSignUp({});
	}

	function handleOpenUserProfile() {
		$clerkInstance?.openUserProfile({});
	}

	function handleSignOut() {
		// Provide afterSignOutUrl, defaults to current URL if not specified
		$clerkInstance?.signOut({ redirectUrl: window.location.href });
	}

	// User dropdown state
	let isUserDropdownOpen = $state(false);

	function toggleUserDropdown() {
		isUserDropdownOpen = !isUserDropdownOpen;
	}

	function closeUserDropdown() {
		isUserDropdownOpen = false;
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
			{#if isStarred && isDirty}
				<Tooltip color="default" offset={6} triggeredBy="#dirty-star">
					This mixture has unsaved changes
				</Tooltip>
				<StarHalfStrokeSolid id="dirty-star" />
			{:else if isStarred}
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

		{#if $clerkUser}
			<div class="flex items-center gap-x-2 relative">
				<!-- User Button with Dropdown -->
				<button
					onclick={toggleUserDropdown}
					class="rounded-full w-8 h-8 overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
					aria-label="User menu"
				>
					{#if $clerkUser.imageUrl}
						<img src={$clerkUser.imageUrl} alt="User profile" class="w-full h-full object-cover" />
					{:else}
						<!-- Fallback avatar -->
						<span
							class="flex items-center justify-center w-full h-full bg-gray-300 text-gray-600 text-xs font-semibold"
						>
							{$clerkUser.firstName?.charAt(0)}{$clerkUser.lastName?.charAt(0)}
						</span>
					{/if}
				</button>

				<!-- Dropdown Menu -->
				{#if isUserDropdownOpen}
					<!-- Backdrop to close dropdown when clicking outside -->
					<div
						class="fixed inset-0 z-10"
						onclick={closeUserDropdown}
						onkeydown={(e) => e.key === 'Escape' && closeUserDropdown()}
						role="button"
						tabindex="-1"
						aria-label="Close user menu"
					></div>

					<!-- Dropdown Panel -->
					<div
						class="absolute right-0 top-10 z-20 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1"
						role="menu"
						aria-orientation="vertical"
					>
						<button
							onclick={handleOpenUserProfile}
							class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
							role="menuitem"
						>
							Show Profile
						</button>
						<button
							onclick={handleSignOut}
							class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
							role="menuitem"
						>
							Sign Out
						</button>
					</div>
				{/if}
			</div>
		{:else}
			<!-- User is signed out -->
			<div class="flex items-center gap-x-2">
				<!-- Sign In Button Replacement -->
				<button
					onclick={handleSignIn}
					class="rounded-full
									w-16 p-0.5
									text-center
									border
									border-primary-300
									dark:border-primary-400
									text-primary-900
									font-medium
									text-sm"
				>
					Sign in
				</button>

				<!-- Sign Up Button Replacement -->
				<button
					onclick={handleSignUp}
					class="rounded-full
									w-16 p-0.5
									text-center
									border
									border-primary-300
									dark:border-primary-400
									bg-white font-medium
									text-sm"
				>
					Sign up
				</button>
			</div>
		{/if}
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
