<script lang="ts">
	import { getContext } from 'svelte';
	import { CLERK_CONTEXT_KEY, type ClerkContext } from '$lib/contexts.js';

	// Get Clerk stores from context
	const clerkStores = getContext<ClerkContext>(CLERK_CONTEXT_KEY);
	const clerkInstance = clerkStores.instance;
	const clerkUser = clerkStores.user;

	function handleSignIn() {
		$clerkInstance?.openSignIn({});
	}

	function handleSignUp() {
		$clerkInstance?.openSignUp({});
	}

	function handleOpenUserProfile() {
		$clerkInstance?.openUserProfile({});
	}

	function handleSignOut() {
		$clerkInstance?.signOut({ redirectUrl: window.location.href });
	}

	let isUserDropdownOpen = $state(false);

	function toggleUserDropdown() {
		isUserDropdownOpen = !isUserDropdownOpen;
	}

	function closeUserDropdown() {
		isUserDropdownOpen = false;
	}
</script>

<!-- Auth Buttons UI -->
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
				<span
					class="flex items-center justify-center w-full h-full bg-gray-300 text-gray-600 text-xs font-semibold"
				>
					{$clerkUser.firstName?.charAt(0)}{$clerkUser.lastName?.charAt(0)}
				</span>
			{/if}
		</button>

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
	<div class="flex items-center gap-x-2">
		<button
			onclick={handleSignIn}
			class="rounded-full w-16 p-0.5 text-center border border-primary-300 dark:border-primary-400 text-primary-900 font-medium text-sm"
		>
			Sign in
		</button>
		<button
			onclick={handleSignUp}
			class="rounded-full w-16 p-0.5 text-center border border-primary-300 dark:border-primary-400 bg-white font-medium text-sm"
		>
			Sign up
		</button>
	</div>
{/if}
