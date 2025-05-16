<script lang="ts">
	// Import context tools and types
	import { getContext, onMount, onDestroy } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { Clerk } from '@clerk/clerk-js';
	import type { UserResource } from '@clerk/types'; // Keep if needed, maybe not here
	import { browser } from '$app/environment';

	interface Props {
		// This prop is populated with the returned data from the load function
		data: { next: string };
	}

	let { data }: Props = $props();

	// Get Clerk instance store from context
	const clerkStores = getContext<{
		instance: Writable<Clerk | null>;
		user: Writable<UserResource | null>;
	}>('clerk');
	const clerkInstance = clerkStores.instance;

	let signInContainer: HTMLDivElement;
	let clerkInstanceValue: Clerk | null = null; // To hold the actual instance

	// Subscribe to the instance store
	const unsubscribeInstance = clerkInstance.subscribe((value) => {
		clerkInstanceValue = value;
		// Attempt to mount when the instance becomes available
		mountComponent();
	});

	function mountComponent() {
		// Ensure we are in the browser, the container exists, and the clerk instance is ready
		if (browser && signInContainer && clerkInstanceValue) {
			console.log('Mounting SignIn component...');
			clerkInstanceValue.mountSignIn(signInContainer, {
				redirectUrl: data.next, // Pass redirect URL from load function
				// Add appearance options if needed
				// appearance: { baseTheme: experimental__simple }
			});
		} else {
			console.log('Conditions not met for mounting SignIn:', {
				browser,
				signInContainer,
				clerkInstanceValue,
			});
		}
	}

	onMount(() => {
		// Attempt initial mount
		mountComponent();
	});

	onDestroy(() => {
		// Cleanup: Unmount the component and unsubscribe
		if (browser && signInContainer && clerkInstanceValue) {
			console.log('Unmounting SignIn component...');
			clerkInstanceValue.unmountSignIn(signInContainer);
		}
		unsubscribeInstance();
	});
</script>

<!-- Container for the mounted Clerk component -->
<div
	bind:this={signInContainer}
	class="clerk-sign-in-container p-8 flex justify-center items-start min-h-screen"
>
	<!-- ClerkJS will mount the SignIn component here -->
	<p>Loading sign in...</p>
	<!-- Placeholder while mounting -->
</div>

<style>
	/* Optional: Add styles if needed */
	.clerk-sign-in-container {
		/* Add any container-specific styles */
	}
</style>
