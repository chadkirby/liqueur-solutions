<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { Drawer, Drawerhead, Fileupload, Li, Tooltip } from 'svelte-5-ui-lib';
	import {
		CloseCircleSolid,
		ListOutline,
		ArrowRightOutline,
		ArrowUpRightFromSquareOutline,
		StarSolid,
		StarOutline,
	} from 'flowbite-svelte-icons';
	import Portal from 'svelte-portal';
	// filesDb is now a collection of functions, SPACE_FILES is no longer exported or needed client-side
	import { deserializeFromStorage, deleteFile as filesDbDelete, toggleStar as filesDbToggleStar, write as filesDbWrite, subscribeToFiles } from '$lib/files-db.js';
	import { filesDrawer } from '$lib/files-drawer-store.svelte.js'; // Corrected path
	import type { StorageId } from '$lib/data-types.js'; // Updated path
	import { openFile, openFileInNewTab } from '$lib/open-file.js';
	import { type MixtureStore } from '$lib/mixture-store.svelte.js';
	import Button from '../ui-primitives/Button.svelte';
	import {
		currentDataVersion,
		isV0Data,
		isV1Data,
		type StoredFileDataV1,
	} from '$lib/data-format.js';
	import Helper from '../ui-primitives/Helper.svelte';
	import { portV0DataToV1 } from '$lib/migrations/v0-v1.js';
	import { deserializeFromUrl } from '$lib/url-serialization.js';
	import { componentId } from '$lib/mixture.js';
	import { resolveRelativeUrl } from '$lib/utils.js';
	import { starredIds } from '$lib/starred-ids.svelte.js';
	interface Props {
		mixtureStore: MixtureStore;
	}

	let { mixtureStore }: Props = $props();

	let onlyStars = $state(false);
	let items = new SvelteMap<StorageId, StoredFileDataV1>();
	let files = $derived(
		Array.from(items.values())
			.filter((f) => !onlyStars || starredIds.includes(f.id))
			.sort((a, b) => b.accessTime - a.accessTime) // Keep existing sort logic if any, or adapt
	);

	// Subscribe to file changes using the new subscribeToFiles
	const unsubscribe = subscribeToFiles((allFiles: StoredFileDataV1[]) => {
		// Repopulate the SvelteMap. This ensures reactivity.
		// Could be optimized if direct map manipulation is preferred and supported by SvelteMap's reactivity.
		items.clear();
		for (const file of allFiles) {
			items.set(file.id, file);
		}
	});

	// Clean up subscription
	if (import.meta.hot) {
		import.meta.hot.dispose(() => {
			if (unsubscribe) unsubscribe();
		});
	}

	let drawerStatus = $derived(filesDrawer.isOpen);
	const closeDrawer = () => filesDrawer.close();

	async function removeItem(id: StorageId) { // Changed key to id and directly use StorageId
		filesDbDelete(id); // Use imported deleteFile
	}

	function domIdFor(key: string, id: StorageId) {
		return `files-drawer-${key}-${id.slice(1)}`;
	}

	// keep track of whether the shift or meta key is pressed
	let modifierKey = $state(false);
	$effect(() => {
		if (drawerStatus) {
			const handleKeyDown = (e: KeyboardEvent) => {
				modifierKey = e.shiftKey || e.metaKey;
			};
			const handleKeyUp = (e: KeyboardEvent) => {
				modifierKey = e.shiftKey || e.metaKey;
				if (e.key === 'Escape') {
					filesDrawer.close();
				}
			};

			window.addEventListener('keydown', handleKeyDown);
			window.addEventListener('keyup', handleKeyUp);

			return () => {
				window.removeEventListener('keydown', handleKeyDown);
				window.removeEventListener('keyup', handleKeyUp);
			};
		}
	});

	const goToFile = (id: StorageId) => {
		return () => {
			filesDrawer.close();
			if (modifierKey) {
				openFileInNewTab(id);
			} else {
				openFile(id);
			}
		};
	};

	function addToMixture(id: StorageId, name: string) {
		return async () => {
			filesDrawer.close();
			const mixture = await deserializeFromStorage(id);
			if (mixture && mixture.isValid) {
				mixtureStore.addIngredientTo(filesDrawer.parentId, {
					name,
					item: mixture,
					mass: mixture.mass,
				});
			}
		};
	}

	function handleExport() {
		// download a json file with all the starred files
		const data = files.filter((f) => starredIds.includes(f.id));
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'saved-mixtures.json';
		a.click();
		URL.revokeObjectURL(url);
	}

	let importFiles: FileList | undefined = $state();

	$effect(() => {
		if (importFiles) {
			const reader = new FileReader();
			reader.onload = () => {
				const data = JSON.parse(reader.result as string);
				for (const item of data) {
					if ('href' in item && 'name' in item) {
						const url = new URL(resolveRelativeUrl(item.href));
						const { mixture } = deserializeFromUrl(url.searchParams);
						const newFileId = componentId(); // Generate ID once
						const v1Data: StoredFileDataV1 = {
							id: newFileId,
							name: item.name,
							accessTime: item.accessTime || Date.now(),
							version: currentDataVersion, // Ensure currentDataVersion is defined, or use item.version
							// desc: item.desc || mixture.describe(), // desc is not in StoredFileDataV1 on server
							rootMixtureId: mixture.id,
							ingredientDb: mixture.serialize(), // This will be stringified by PartyKitSync
						};
						filesDbWrite(v1Data).then(() => filesDbToggleStar(newFileId)); // Use imported toggleStar
						continue;
					}
					// Assuming item is already StoredFileDataV1 if not a URL import
					// The old isV0Data/isV1Data logic is removed as filesDb now expects V1 from PartyKitSync
					if (item && typeof item === 'object' && 'id' in item && 'version' in item) {
						filesDbWrite(item as StoredFileDataV1);
					}
				}
			};
			reader.readAsText(importFiles[0]);
			onlyStars = false;
		}
	});
</script>

<ListOutline class="text-white" onclick={filesDrawer.toggle} />

<Portal target="body">
	<Drawer {drawerStatus} {closeDrawer} backdrop={true} class="flex flex-col h-full p-0">
		<div
			class="
			sticky
			top-0
			bg-white
			border-primary-200
			dark:bg-primary-700
			dark:border-primary-600
			border-b
			z-10"
		>
			<Drawerhead onclick={closeDrawer}>
				<section class="flex flex-col items-center">
					<h5
						id="drawer-label"
						class="
						inline-flex
						items-center
						p-4
						text-lg
						font-semibold
						text-primary-500 dark:text-primary-400"
					>
						Saved Mixtures
					</h5>
					<!-- show all files or only starred files checkbox -->
					<div class="flex flex-row items-center mb-1 ml-4">
						<input type="checkbox" bind:checked={onlyStars} class="mr-2" id="only-stars-checkbox" />
						<label
							for="only-stars-checkbox"
							class="text-sm text-primary-500 dark:text-primary-400 cursor-pointer"
							>Only show starred files</label
						>
					</div>
				</section>
			</Drawerhead>
		</div>

		<div class="flex-1 overflow-y-auto px-4 mt-2">
			{#each files as { name, id, desc } (id)}
				<div
					class="
					flex flex-col
					pb-1
					border-b-secondary-200
					dark:border-b-primary-600
					border-b-2
					"
				>
					<div
						class="
							flex flex-col
							items-start
							mb-1
							w-full
							text-sm
						"
					>
						<div class="flex flex-row items-center gap-2">
							<Button onclick={() => filesDbToggleStar(id)}> {/* Use imported toggleStar */}
								{#if starredIds.includes(id)}
									<StarSolid size="xs" />
								{:else}
									<StarOutline size="xs" />
								{/if}
							</Button>
							<span class="text-primary-800 dark:text-primary-400 font-medium">{name}</span>
						</div>
						{/* <span class="text-xs text-primary-800 dark:text-primary-400">{desc}</span> */}{/* desc removed from StoredFileDataV1 */}
					</div>
					<div class="flex flex-row justify-around">
						<Tooltip
							color="default"
							offset={6}
							position="bottom"
							triggeredBy={`#${domIdFor('remove', id)}`}
						>
							Delete {name}
						</Tooltip>
						<Tooltip color="default" offset={6} triggeredBy={`#${domIdFor('open', id)}`}>
							Open {name}
							{#if modifierKey}in new tab{/if}
						</Tooltip>
						<Tooltip color="default" offset={6} triggeredBy={`#${domIdFor('add', id)}`}>
							Add {name} into current mixture
						</Tooltip>

						<Button
							id={domIdFor('remove', id)}
							onclick={() => removeItem(id)}
							onkeydown={goToFile(id)}
							class="px-1.5 text-primary-600 dark:text-primary-400"
						>
							<CloseCircleSolid size="sm" />
							Delete
						</Button>

						<Button
							id={domIdFor('open', id)}
							onclick={goToFile(id)}
							onkeydown={goToFile(id)}
							class="px-1.5 text-primary-600 dark:text-primary-400"
						>
							Open
							<ArrowUpRightFromSquareOutline size="sm" />
						</Button>

						<Button
							id={domIdFor('add', id)}
							onclick={addToMixture(id, name)}
							onkeydown={addToMixture(id, name)}
							class="px-1.5 text-primary-600 dark:text-primary-400"
						>
							Add
							<ArrowRightOutline size="md" />
						</Button>
					</div>
				</div>
			{/each}
			<!-- export-all button -->
			<div class="flex flex-col justify-center mt-4 gap-4">
				<Button class="px-2 py-1 text-primary-600 dark:text-primary-400" onclick={handleExport}>
					Export Starred
				</Button>
				<section>
					<Helper>Import (JSON format from export)</Helper>
					<Fileupload bind:files={importFiles} accept=".json"/>
				</section>
			</div>
		</div></Drawer
	>
</Portal>
