<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { Clerk } from '@clerk/clerk-js';
	import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';
	import { experimental__simple } from '@clerk/themes';
	import { writable } from 'svelte/store';
	import { setContext } from 'svelte';
	import { persistenceContext } from '$lib/persistence.js';

	import '../app.postcss';
	import type { UserResource } from '@clerk/types';
	import { CLERK_CONTEXT_KEY, type ClerkContext } from '$lib/contexts.js';
	import { syncManager } from '$lib/sync-manager.js';
	// 1) Create two stores: one for the Clerk instance, one for the current user.
	const clerkInstance = writable<Clerk | null>(null);
	const clerkUser = writable<UserResource | null>(null);

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
	console.log('Clerk layout');
	// 2) Make them available to all descendants via context
	setContext<ClerkContext>(CLERK_CONTEXT_KEY, { instance: clerkInstance, user: clerkUser });

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
					console.log('User signed in:', user.id);
					syncManager.startAll();
				} else {
					syncManager.pauseAll();
				}
			});
		});

		if (persistenceContext.mixtureFiles && persistenceContext.stars) {
			const aMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
			try {
				const stars = new Set(persistenceContext.stars.find({}).map(({ id }) => id));
				const files = persistenceContext.mixtureFiles.find(
					{ accessTime: { $lt: aMonthAgo } },
					{ fields: { id: 1 } },
				);
				files.forEach(({ id }) => {
					if (!stars.has(id)) {
						persistenceContext.mixtureFiles?.removeOne({ id });
					}
				});
			} catch (e) {
				console.error('FilesDb janitor error', e);
			}
		}

		// 7) Clean up when this layout is unmounted
		return () => {
			if (unsubscribeFromClerk) {
				unsubscribeFromClerk();
			}
			syncManager.dispose();
		};
	});
</script>

{@render children?.()}
