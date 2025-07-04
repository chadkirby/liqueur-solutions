<script lang="ts">
	import { getContext, onMount, onDestroy } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { Clerk } from '@clerk/clerk-js';
	import type { UserResource } from '@clerk/types';
	import { browser } from '$app/environment';
	import { CLERK_CONTEXT_KEY, type ClerkContext } from '$lib/contexts.js';

	// Get Clerk stores from context
	const clerkStores = getContext<ClerkContext>(CLERK_CONTEXT_KEY);
	const clerkInstance = clerkStores.instance;
	const clerkUser = clerkStores.user;

	let userProfileContainer: HTMLDivElement;
	let clerkInstanceValue: Clerk | null = null; // To hold the actual instance

	// Subscribe to the instance store
	const unsubscribeInstance = clerkInstance.subscribe((value) => {
		clerkInstanceValue = value;
		// Attempt to mount when the instance becomes available
		mountComponent();
	});

	// Subscribe to the user store to potentially unmount if user signs out while on page
	const unsubscribeUser = clerkUser.subscribe((user) => {
		if (browser && !user && clerkInstanceValue) {
			// If user signs out, unmount the component
			clerkInstanceValue.unmountUserProfile(userProfileContainer);
		} else if (browser && user && clerkInstanceValue && userProfileContainer) {
			// If user signs back in (less likely on this specific page, but for completeness)
			mountComponent();
		}
	});

	function mountComponent() {
		// Ensure we are in the browser, the container exists, and the clerk instance is ready
		if (browser && userProfileContainer && clerkInstanceValue && $clerkUser) {
			console.log('Mounting UserProfile component...');
			clerkInstanceValue.mountUserProfile(userProfileContainer, {
				// Add appearance options if needed, e.g.,
				// appearance: { baseTheme: experimental__simple }
			});
		} else {
			console.log('Conditions not met for mounting UserProfile:', {
				browser,
				userProfileContainer,
				clerkInstanceValue,
				$clerkUser,
			});
		}
	}

	onMount(() => {
		// Attempt initial mount in case the instance was already available
		mountComponent();
	});

	onDestroy(() => {
		// Cleanup: Unmount the component and unsubscribe from stores
		if (browser && userProfileContainer && clerkInstanceValue) {
			console.log('Unmounting UserProfile component...');
			clerkInstanceValue.unmountUserProfile(userProfileContainer);
		}
		unsubscribeInstance();
		unsubscribeUser();
	});

	function handleSignOut() {
		clerkInstanceValue?.signOut({ redirectUrl: '/' }); // Redirect to home after sign out
	}
</script>

<!-- Container for the mounted Clerk component -->
<div
	bind:this={userProfileContainer}
	class="clerk-user-profile-container p-8 flex justify-center items-start min-h-screen"
>
	<!-- ClerkJS will mount the UserProfile component here -->
	{#if !$clerkUser}
		<p>Loading user profile or not signed in...</p>
	{/if}
</div>

<!-- Separate Sign Out Button -->
<div class="fixed bottom-4 right-4">
	<button
		onclick={handleSignOut}
		class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
		disabled={!$clerkUser}
	>
		Sign Out
	</button>
</div>

<style>
	/* Optional: Add styles if needed, though Clerk's component is self-contained */
	.clerk-user-profile-container {
		width: 100%;
		max-width: 400px; /* Adjust as needed */
		margin: 0 auto;
		padding: 16px;
		background-color: #f9f9f9; /* Optional background color */
		border-radius: 8px; /* Optional border radius */
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* Optional shadow */
	}
</style>
