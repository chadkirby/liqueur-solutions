<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { Clerk } from '@clerk/clerk-js';
	import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';
	import { experimental__simple } from '@clerk/themes';
	import { writable } from 'svelte/store';
	import { setContext } from 'svelte';
	import {
		type PersistenceContext,
		createMixturesCollection,
		createStarsCollection,
		PERSISTENCE_CONTEXT_KEY,
	} from '$lib/contexts.js';
	import { browser } from '$app/environment';

	import '../app.postcss';
	import type { UserResource } from '@clerk/types';
	import { CLERK_CONTEXT_KEY, type ClerkContext } from '$lib/contexts.js';
	import { syncManager } from '$lib/sync-manager.js';
	import { currentDataVersion } from '$lib/data-format.js';
	// 1) Create two stores: one for the Clerk instance, one for the current user.
	const clerkInstance = writable<Clerk | null>(null);
	const clerkUser = writable<UserResource | null>(null);

	interface Props {
		children?: Snippet;
	}

	const persistenceContext: PersistenceContext = browser
		? {
				mixtureFiles: createMixturesCollection(),
				stars: createStarsCollection(),
				upsertFile: (item: { id: string; name: string; mixture: any }) => {
					if (!persistenceContext.mixtureFiles) return;
					const accessTime = new Date().toISOString();
					persistenceContext.mixtureFiles.replaceOne(
						{ id: item.id },
						{
							version: currentDataVersion,
							id: item.id,
							name: item.name,
							accessTime,
							desc: item.mixture.describe(),
							rootMixtureId: item.mixture.id,
							ingredientDb: item.mixture.serialize(),
							_ingredientHash: item.mixture.getIngredientHash(item.name),
						},
						{ upsert: true },
					);
				},
				toggleStar: (id: string) => {
					if (!persistenceContext.stars) return false;
					const existing = persistenceContext.stars.findOne({ id });
					if (existing) {
						persistenceContext.stars.removeOne({ id });
						return false;
					} else {
						persistenceContext.stars.insert({ id });
						return true;
					}
				},
			}
		: {
				mixtureFiles: null,
				stars: null,
				upsertFile: () => {},
				toggleStar: () => false,
			};

	setContext<PersistenceContext>(PERSISTENCE_CONTEXT_KEY, persistenceContext);

	if (persistenceContext.mixtureFiles && persistenceContext.stars) {
		syncManager.addCollection(persistenceContext.mixtureFiles, {
			name: 'mixtureFiles',
			apiPath: '/api/mixtures',
		});
		syncManager.addCollection(persistenceContext.stars, {
			name: 'stars',
			apiPath: '/api/stars',
		});
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
