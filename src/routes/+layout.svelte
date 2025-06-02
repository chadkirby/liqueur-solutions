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
	import {
		runJanitor,
		type CloudFileData,
		CloudFiles,
		initCloudFile,
	} from '$lib/persistence.svelte.js';
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
					if (CloudFiles?.find({}).count() === 0) {
						console.log('FilesDb: No cloud files found, inserting from API');
						// If no cloud files exist, fetch them from the API
						// and insert them into the CloudFiles collection
						insertCloudFiles().then(() => {
							const cloudIds =
								CloudFiles?.find({}, { fields: { id: 1 } }).map((item) => item.id) || [];
							console.log('FilesDb: Found cloud files:', cloudIds);
							runJanitor(new Set(cloudIds));
						});
					}
				} else {
					CloudFiles?.removeMany({});
				}
			});
		});

		// 7) Clean up when this layout is unmounted
		return () => {
			if (unsubscribeFromClerk) {
				unsubscribeFromClerk();
			}
		};
	});

	async function insertCloudFiles(): Promise<void> {
		const filesResp = await fetch('../api/mixtures');
		if (!filesResp.ok) {
			throw new Error('FilesDb: Failed to fetch cloud files: ' + filesResp.statusText);
		}
		// call the callback for each file in the streamed response
		const reader = filesResp.body?.getReader();
		if (!reader) {
			throw new Error('FilesDb: Response body is null');
		}
		const decoder = new TextDecoder();
		let buffer = '';
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
				for (const line of lines) {
					if (line.trim()) {
						const file = JSON.parse(line) as CloudFileData;
						try {
							initCloudFile(file);
						} catch (error) {
							console.error('FilesDb: Error inserting file:', error);
						}
					}
				}
			}
			// Process any remaining data in buffer
			if (buffer.trim()) {
				const fileData = JSON.parse(buffer) as CloudFileData;
				try {
					CloudFiles?.insert(fileData);
				} catch (error) {
					console.error('FilesDb: Error inserting last file:', error);
				}
			}
		} catch (e) {
			console.error('FilesDb: Error reading cloud files:', e);
			throw new Error('FilesDb: Failed to read cloud files');
		}
	}
</script>

{@render children?.()}
