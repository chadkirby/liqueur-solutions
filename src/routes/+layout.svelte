<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { Clerk } from '@clerk/clerk-js';
	import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';
	import { experimental__simple } from '@clerk/themes';
	import { writable, get } from 'svelte/store';
	import { setContext } from 'svelte';

	import '../app.postcss';
	import type { UserResource } from '@clerk/types';

	// PartyKitSync imports
	import { initializePartyKitSync, partyKitSyncStore } from '$lib/files-db.js';
	import type PartyKitSync from '$lib/partykit-sync.js'; // Ensure this path is correct and PartyKitSync is the default export or a named export

	// 1) Create two stores: one for the Clerk instance, one for the current user.
	const clerkInstance = writable<Clerk | null>(null);
	const clerkUser = writable<UserResource | null>(null);
	let currentPartyKitSync: PartyKitSync | null = null; // Renamed from PartyKitSync to avoid conflict with type

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
	// console.log('Clerk layout');
	// 2) Make them available to all descendants via context
	setContext('clerk', { instance: clerkInstance, user: clerkUser });
	setContext('partyKitSync', partyKitSyncStore); // Provide PartyKitSync store in context

	// Subscribe to Clerk user changes to initialize/destroy PartyKitSync
	clerkUser.subscribe(async ($user) => {
		const currentClerk = get(clerkInstance); // Get current Clerk instance
		if ($user && $user.id && currentClerk && typeof currentClerk.session?.getToken === 'function') {
			if (currentPartyKitSync && currentPartyKitSync.userId === $user.id) {
				// Already initialized for this user
				return;
			}
			// If there's an existing PartyKitSync for a different user, close it
			if (currentPartyKitSync) {
				currentPartyKitSync.close();
				partyKitSyncStore.set(null);
			}
			console.log(`Initializing PartyKitSync for user ${$user.id}`);
			const getToken = () => currentClerk.session!.getToken({ template: 'partykit' });
			currentPartyKitSync = initializePartyKitSync($user.id, getToken);
			// Optional: Attach to window for debugging: window.partyKitSync = currentPartyKitSync;
		} else if (!$user && currentPartyKitSync) {
			console.log('User logged out, closing PartyKitSync');
			currentPartyKitSync.close();
			partyKitSyncStore.set(null);
			currentPartyKitSync = null;
		}
	});

	onMount(() => {
		// console.log('Clerk mount');
		// 3) Instantiate Clerk on first mount
		const clerk = new Clerk(PUBLIC_CLERK_PUBLISHABLE_KEY);

		let unsubscribeFromClerk: () => void;
		// 4) Load Clerk's UI assets/themes
		clerk.load({ appearance: { baseTheme: experimental__simple } }).then(() => {
			// console.log('Clerk loaded');
			// 5) Push Clerk instance & initial user onto our stores
			clerkInstance.set(clerk);
			clerkUser.set(clerk.user ?? null); // This will trigger the subscription above

			// 6) Listen for any future sign-in / sign-out events
			unsubscribeFromClerk = clerk.addListener(({ user }) => {
				clerkUser.set(user ?? null); // This will trigger the subscription above
				// filesDb.startSync() / stopSync() will be handled by PartyKitSync lifecycle or removed
			});
		});

		// 7) Clean up when this layout is unmounted
		return () => {
			if (unsubscribeFromClerk) {
				unsubscribeFromClerk();
			}
			if (currentPartyKitSync) {
				console.log('Layout unmounting, closing PartyKitSync');
				currentPartyKitSync.close();
				partyKitSyncStore.set(null);
				currentPartyKitSync = null;
			}
			// filesDb.stopSync(); // Will be handled by PartyKitSync or removed
		};
	});
</script>

{@render children?.()}
