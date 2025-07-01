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
	import { isV0Data, isV1Data, zFileDataV1 } from '$lib/data-format.js';
	import Helper from '../ui-primitives/Helper.svelte';
	import { portV0DataToV1 } from '$lib/migrations/v0-v1.js';
	import { deserializeFromUrl } from '$lib/url-serialization.js';
	import { componentId, Mixture } from '$lib/mixture.js';
	import { resolveRelativeUrl } from '$lib/utils.js';
	import { SvelteSet } from 'svelte/reactivity';

	import { PERSISTENCE_CONTEXT_KEY, type PersistenceContext } from '$lib/contexts.js';
	import { getContext } from 'svelte';
	const persistenceContext = getContext<PersistenceContext>(PERSISTENCE_CONTEXT_KEY);
	import { rollbar } from '$lib/rollbar';

	interface Props {
		mixtureStore: MixtureStore;
	}

	const starredIds = $derived(
		new SvelteSet(persistenceContext.stars?.find({}).map((s) => s.id) || []),
	);

	const mixtureFiles = $derived(
		persistenceContext.mixtureFiles?.find({}, { sort: { accessTime: -1 } }).fetch(),
	);

	const tempFiles = $derived(mixtureFiles?.filter((f) => !starredIds.has(f.id)));
	const starredFiles = $derived(mixtureFiles?.filter((f) => starredIds.has(f.id)));

	const { mixtureStore }: Props = $props();

	let showTempFiles = $state(false);
	const files = $derived([
		...(starredFiles ? starredFiles : []),
		...(showTempFiles && tempFiles ? tempFiles : []),
	]);

	let drawerStatus = $derived(filesDrawer.isOpen);
	const closeDrawer = () => filesDrawer.close();

	async function removeItem(key: string) {
		const id = toStorageId(key);
		persistenceContext.mixtureFiles?.removeOne({ id });
		persistenceContext.stars?.removeOne({ id });
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
				rollbar.error('Failed to load mixture', await resp.text());
				return;
			}
			const mxData = zFileDataV1.safeParse(await resp.json());
			if (!mxData.success) {
				rollbar.error('Failed to parse mixture data', mxData.error);
				return;
			}
			const mixture = Mixture.deserialize(mxData.data.rootMixtureId, mxData.data.ingredientDb);
			if (mixture && mixture.isValid) {
				mixtureStore.addIngredientTo(filesDrawer.parentId, {
					name,
					mass: mixture.mass,
					item: mixture,
				});
			}
		};
	}

	function handleExport() {
		// download a json file with all the starred files
		const data = files?.filter((f) => starredIds.has(f.id)) || [];
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'saved-mixtures.json';
		a.click();
		URL.revokeObjectURL(url);
	}

	let importFiles: FileList | undefined = $state();

	async function writeUnlessExists(item: {
		id: string;
		name: string;
		mixture: Mixture;
	}): Promise<void> {
		if (!isStorageId(item.id)) return;
		if (!persistenceContext.mixtureFiles) return;
		const hash = item.mixture.getIngredientHash(item.name);
		if (persistenceContext.mixtureFiles.findOne({ _ingredientHash: hash })) return;
		await persistenceContext.upsertFile(item);
		await persistenceContext.toggleStar(item.id);
	}

	$effect(() => {
		if (importFiles) {
			const reader = new FileReader();
			reader.onload = () => {
				const data = JSON.parse(reader.result as string);
				for (const item of data) {
					if ('href' in item && 'name' in item) {
						const url = new URL(resolveRelativeUrl(item.href));
						const { mixture } = deserializeFromUrl(url.searchParams);
						writeUnlessExists({ id: componentId(), name: item.name, mixture });
						continue;
					}
					const v1Data = isV1Data(item) ? item : isV0Data(item) ? portV0DataToV1(item) : null;
					if (v1Data)
						writeUnlessExists({
							id: v1Data.id,
							name: v1Data.name,
							mixture: Mixture.deserialize(v1Data.rootMixtureId, v1Data.ingredientDb),
						});
					else rollbar.warn('Invalid file format', item);
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
			{#each files as { name, id, desc, accessTime } (id)}
				{@const lastAccess = new Date(accessTime).toLocaleDateString(navigator.language, {
					year: '2-digit',
					month: 'numeric',
					day: 'numeric',
					hour: 'numeric',
					minute: '2-digit',
					hour12: true,
				})}
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
								{#if starredIds.has(id)}
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
