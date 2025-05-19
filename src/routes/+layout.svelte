<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { Clerk } from '@clerk/clerk-js';
	import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';
	import { experimental__simple } from '@clerk/themes';
	import { writable } from 'svelte/store';
	import { setContext } from 'svelte';
	import { filesDb } from '$lib/files-db';

	import '../app.postcss';
	import type { UserResource } from '@clerk/types';
	// 1) Create two stores: one for the Clerk instance, one for the current user.
	const clerkInstance = writable<Clerk | null>(null);
	const clerkUser = writable<UserResource | null>(null);

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
	console.log('Clerk layout');
	// 2) Make them available to all descendants via context
	setContext('clerk', { instance: clerkInstance, user: clerkUser });

	onMount(() => {
		console.log('Clerk mount');
		// 3) Instantiate Clerk on first mount
		const clerk = new Clerk(PUBLIC_CLERK_PUBLISHABLE_KEY);

		let unsubscribeFromClerk: () => void;
		// 4) Load Clerk's UI assets/themes
		clerk.load({ appearance: { baseTheme: experimental__simple } }).then(() => {
			console.log('Clerk loaded');
			// 5) Push Clerk instance & initial user onto our stores
			clerkInstance.set(clerk);
			clerkUser.set(clerk.user ?? null);

			// 6) Listen for any future sign-in / sign-out events
			unsubscribeFromClerk = clerk.addListener(({ user }) => {
				clerkUser.set(user ?? null);
				if (user) {
					filesDb.startSync();
				} else {
					filesDb.stopSync();
				}
			});
		});

		// schedule the janitor task to run once
		const janitor = setTimeout(() => {
			filesDb.runJanitor().then(() => filesDb.migrateV0ToV1());
		}, 2000);

		// 7) Clean up when this layout is unmounted
		return () => {
			if (janitor) clearInterval(janitor);
			if (unsubscribeFromClerk) {
				unsubscribeFromClerk();
			}
			filesDb.stopSync();
		};
	});
</script>

{@render children?.()}
