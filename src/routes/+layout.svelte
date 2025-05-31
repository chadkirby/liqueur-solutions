<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { Clerk } from '@clerk/clerk-js';
	import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';
	import { experimental__simple } from '@clerk/themes';
	import { writable } from 'svelte/store';
	import { setContext } from 'svelte';

	import '../app.postcss';
	import type { UserResource } from '@clerk/types';
	import { CLERK_CONTEXT_KEY, type ClerkContext } from '$lib/contexts.js';
	import { runJanitor, type CloudFileData, setCloudFiles } from '$lib/persistence.svelte.js';
	// 1) Create two stores: one for the Clerk instance, one for the current user.
	const clerkInstance = writable<Clerk | null>(null);
	const clerkUser = writable<UserResource | null>(null);

	interface Props {
		children?: Snippet;
		data: {
			cloudFiles: CloudFileData[];
		};
	}

	let { children, data }: Props = $props();
	console.log('Clerk layout');
	// 2) Make them available to all descendants via context
	setContext<ClerkContext>(CLERK_CONTEXT_KEY, { instance: clerkInstance, user: clerkUser });
	setCloudFiles(data.cloudFiles);

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
					setCloudFiles(data.cloudFiles);
				} else {
					setCloudFiles([]);
				}
			});
		});

		// schedule the janitor task to run once
		const janitor = setTimeout(() => {
			runJanitor(new Set(data.cloudFiles.map((item) => item.id)));
		}, 2000);

		// 7) Clean up when this layout is unmounted
		return () => {
			if (janitor) clearTimeout(janitor);
			if (unsubscribeFromClerk) {
				unsubscribeFromClerk();
			}
		};
	});
</script>

{@render children?.()}
