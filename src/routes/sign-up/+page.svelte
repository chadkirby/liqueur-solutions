<script lang="ts">
	// Import context tools and types
	import { getContext, onMount, onDestroy } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { Clerk } from '@clerk/clerk-js';
	import { browser } from '$app/environment';

	interface Props {
		// This prop is populated with the returned data from the load function
		data: { next: string };
	}

	let { data }: Props = $props();

	// Get Clerk instance store from context
	const clerkStores = getContext<{ instance: Writable<Clerk | null>; user: Writable<any | null> }>(
		'clerk',
	); // User type might not be needed
	const clerkInstance = clerkStores.instance;

	let signUpContainer: HTMLDivElement;
	let clerkInstanceValue: Clerk | null = null; // To hold the actual instance

	// Subscribe to the instance store
	const unsubscribeInstance = clerkInstance.subscribe((value) => {
		clerkInstanceValue = value;
		// Attempt to mount when the instance becomes available
		mountComponent();
	});

	function mountComponent() {
		// Ensure we are in the browser, the container exists, and the clerk instance is ready
		if (browser && signUpContainer && clerkInstanceValue) {
			console.log('Mounting SignUp component...');
			clerkInstanceValue.mountSignUp(signUpContainer, {
				redirectUrl: data.next, // Pass redirect URL from load function
				// Add appearance options if needed
				// appearance: { baseTheme: experimental__simple }
			});
		} else {
			console.log('Conditions not met for mounting SignUp:', {
				browser,
				signUpContainer,
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
		if (browser && signUpContainer && clerkInstanceValue) {
			console.log('Unmounting SignUp component...');
			clerkInstanceValue.unmountSignUp(signUpContainer);
		}
		unsubscribeInstance();
	});
</script>

<!-- Container for the mounted Clerk component -->
<div
	bind:this={signUpContainer}
	class="clerk-sign-up-container p-8 flex justify-center items-start min-h-screen"
>
	<!-- ClerkJS will mount the SignUp component here -->
	<p>Loading sign up...</p>
	<!-- Placeholder while mounting -->
</div>

<style>
	/* Optional: Add styles if needed */
	.clerk-sign-up-container {
		/* Add any container-specific styles */
	}
</style>
