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
	import { deserializeFromStorage, filesDb, SPACE_FILES } from '$lib/files-db.js';
	import { filesDrawer } from '$lib/files-drawer-store.svelte';
	import { toStorageId, type StorageId } from '$lib/storage-id.js';
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
		Array.from(items.values()).filter((f, i) => {
			if (i === 0) console.log('filtering', items.size);
			return !onlyStars || starredIds.includes(f.id);
		}),
	);

	// Subscribe to file changes
	const unsubscribe = filesDb.rep?.subscribe(
		async (tx) => await tx.scan({ prefix: SPACE_FILES }).values().toArray(),
		(allItems) => {
			console.log('scan data', allItems.length);
			items.clear();
			for (const data of allItems) {
				if (isV1Data(data)) {
					items.set(data.id, data);
				} else if (isV0Data(data)) {
					const v1Data = portV0DataToV1(data);
					items.set(v1Data.id, v1Data);
				}
			}
		},
	);

	// Clean up subscription
	if (import.meta.hot) {
		import.meta.hot.dispose(() => {
			if (unsubscribe) unsubscribe();
		});
	}

	let drawerStatus = $derived(filesDrawer.isOpen);
	const closeDrawer = () => filesDrawer.close();

	async function removeItem(key: string) {
		const id = toStorageId(key);
		filesDb.delete(id);
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
						const v1Data: StoredFileDataV1 = {
							id: componentId(),
							name: item.name,
							accessTime: item.accessTime || Date.now(),
							version: currentDataVersion,
							desc: item.desc || mixture.describe(),
							rootMixtureId: mixture.id,
							ingredientDb: mixture.serialize(),
						};
						filesDb.write(v1Data).then(() => filesDb.toggleStar(v1Data.id));
						continue;
					}
					const v1Data = isV1Data(item) ? item : isV0Data(item) ? portV0DataToV1(item) : null;
					if (v1Data) filesDb.write(v1Data);
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
							<Button onclick={() => filesDb.toggleStar(id)}>
								{#if starredIds.includes(id)}
									<StarSolid size="xs" />
								{:else}
									<StarOutline size="xs" />
								{/if}
							</Button>
							<span class="text-primary-800 dark:text-primary-400 font-medium">{name}</span>
						</div>
						<span class="text-xs text-primary-800 dark:text-primary-400">{desc}</span>
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
					Export All
				</Button>
				<section>
					<Helper>Import</Helper>
					<Fileupload bind:files={importFiles} />
				</section>
			</div>
		</div></Drawer
	>
</Portal>
