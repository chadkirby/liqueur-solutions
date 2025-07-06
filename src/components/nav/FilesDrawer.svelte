<script lang="ts">
	import { Drawer, Drawerhead, Fileupload, Tooltip } from 'svelte-5-ui-lib';
	import {
		CloseCircleSolid,
		ListOutline,
		ArrowRightOutline,
		ArrowUpRightFromSquareOutline,
		StarSolid,
		StarOutline,
	} from 'flowbite-svelte-icons';
	import Portal from 'svelte-portal';
	import { filesDrawer } from '$lib/files-drawer-store.svelte';
	import { isStorageId, toStorageId, type StorageId } from '$lib/storage-id.js';
	import { openFile, openFileInNewTab } from '$lib/open-file.js';
	import { type MixtureStore } from '$lib/mixture-store.svelte.js';
	import Button from '../ui-primitives/Button.svelte';
	import { getIngredientHash, type UnifiedSerializationDataV2 } from '$lib/data-format.js';
	import Helper from '../ui-primitives/Helper.svelte';
	import { decompress, deserialize } from '$lib/url-serialization.js';
	import { Mixture } from '$lib/mixture.js';
	import { resolveRelativeUrl } from '$lib/utils.js';

	import { persistenceContext } from '$lib/persistence.js';

	interface Props {
		mixtureStore: MixtureStore;
	}

	const tempFiles = $derived(
		persistenceContext.mixtureFiles?.find({ starred: false }, { sort: { accessTime: -1 } }).fetch(),
	);
	const starredFiles = $derived(
		persistenceContext.mixtureFiles?.find({ starred: true }, { sort: { accessTime: -1 } }).fetch(),
	);

	const { mixtureStore }: Props = $props();

	/* svelte-ignore state_referenced_locally */
	let showTempFiles = $state(starredFiles?.length === 0);
	const files = $derived([
		...(starredFiles ? starredFiles : []),
		...(showTempFiles && tempFiles ? tempFiles : []),
	]);

	let drawerStatus = $derived(filesDrawer.isOpen);
	const closeDrawer = () => filesDrawer.close();

	async function removeItem(key: string) {
		const id = toStorageId(key);
		await persistenceContext.removeMixture(id);
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
			const resp = await fetch(`/api/mixtures/${id}`);
			if (!resp.ok) {
				console.error('Failed to load mixture', await resp.text());
				return;
			}
			try {
				const mxData = deserialize(await resp.json());
				const mixture = Mixture.deserialize(mxData.mx.rootIngredientId, mxData.ingredients);
				if (mixture && mixture.isValid) {
					mixtureStore.addIngredientTo(filesDrawer.parentId, {
						name,
						mass: mixture.mass,
						item: mixture,
					});
				}
			} catch (error) {
				console.error('Failed to parse mixture data', error);
			}
		};
	}

	async function handleExport() {
		// download a json file with all the shown files
		const data = files?.filter((f) => f.starred) || [];
		const exportData: Array<UnifiedSerializationDataV2 | null> = await Promise.all(data.map((f) => {
			return persistenceContext.getExportData(f.id);
		}));
		const blob = new Blob([JSON.stringify(exportData.filter((f) => f), null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'saved-mixtures.json';
		a.click();
		URL.revokeObjectURL(url);
	}

	let importFiles: FileList | undefined = $state();

	async function writeUnlessExists(item: UnifiedSerializationDataV2): Promise<void> {
		const { mx, ingredients } = item;
		if (!isStorageId(mx.id)) return;
		if (!persistenceContext.mixtureFiles) return;
		const hash = getIngredientHash(mx, ingredients);
		if (persistenceContext.mixtureFiles.findOne({ hash })) return;
		const mixture = Mixture.deserialize(mx.rootIngredientId, ingredients);
		await persistenceContext.upsertMx({ id: mx.id, name: mx.name, mixture }, {starred: true});
	}

	$effect(() => {
		if (importFiles) {
			const reader = new FileReader();
			reader.onload = () => {
				const data = JSON.parse(reader.result as string);
				for (const item of data) {
					try {
						if ('href' in item && 'name' in item) {
							const url = new URL(resolveRelativeUrl(item.href));
							const data = decompress(url.searchParams, item.name);
							writeUnlessExists(data);
						} else {
							const data = deserialize(item);
							writeUnlessExists(data);
						}
					} catch (error) {
						console.warn('Invalid file format', error);
					}
				}
			};
			reader.readAsText(importFiles[0]);
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
						<input type="checkbox" bind:checked={showTempFiles} class="mr-2" id="show-temp-files" />
						<label
							for="show-temp-files"
							class="text-sm text-primary-500 dark:text-primary-400 cursor-pointer"
							>Show temp files</label
						>
					</div>
				</section>
			</Drawerhead>
		</div>

		<div class="flex-1 overflow-y-auto px-4 mt-2">
			{#each files as { name, id, desc, updated, starred } (id)}
				{@const lastAccess = new Date(updated).toLocaleDateString(navigator.language, {
					year: '2-digit',
					month: 'numeric',
					day: 'numeric',
					hour: 'numeric',
					minute: '2-digit',
					hour12: true,
				})}
				{@const isCurrent = id === mixtureStore?.storeId}
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
						<div class="flex flex-row items-center w-full">
							<Button onclick={() => persistenceContext.toggleStar(id)}>
								{#if starred}
									<StarSolid size="xs" />
								{:else}
									<StarOutline size="xs" />
								{/if}
							</Button>
							<span class="text-primary-800 dark:text-primary-400 font-medium ml-2">{name}</span>
							<span class="text-primary-600 dark:text-primary-600 text-xs ml-auto"
								>({lastAccess})</span
							>
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
							disabled={isCurrent}
							class="px-1.5 text-primary-600 dark:text-primary-400"
						>
							<CloseCircleSolid size="sm" />
							Delete
						</Button>

						<Button
							id={domIdFor('open', id)}
							onclick={goToFile(id)}
							onkeydown={goToFile(id)}
							disabled={isCurrent}
							class="px-1.5 text-primary-600 dark:text-primary-400"
						>
							Open
							<ArrowUpRightFromSquareOutline size="sm" />
						</Button>

						<Button
							id={domIdFor('add', id)}
							onclick={addToMixture(id, name)}
							onkeydown={addToMixture(id, name)}
							disabled={isCurrent}
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
