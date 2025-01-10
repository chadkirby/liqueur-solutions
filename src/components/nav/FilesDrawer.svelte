<script lang="ts">
	import { Drawer, Drawerhead, Fileupload, Li, Tooltip } from 'svelte-5-ui-lib';
	import {
		CloseCircleSolid,
		ListOutline,
		ArrowRightOutline,
		ArrowUpRightFromSquareOutline,
		StarSolid,
		StarOutline
	} from 'flowbite-svelte-icons';
	import Portal from 'svelte-portal';
	import { filesDb, type FileItem } from '$lib/local-storage.svelte';
	import { deserializeFromLocalStorage } from '$lib/deserialize.js';
	import { filesDrawer } from '$lib/files-drawer-store.svelte';
	import { asStorageId, type StorageId } from '$lib/storage-id.js';
	import { openFile, openFileInNewTab } from '$lib/open-file.js';
	import { starredIds } from '$lib/stars.svelte.js';
	import Button from '../ui-primitives/Button.svelte';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';
	import Helper from '../ui-primitives/Helper.svelte';

	interface Props {
		mixtureStore: MixtureStore;
	}

	let { mixtureStore }: Props = $props();

	type ListedFile = FileItem & {
		isStarred: boolean;
	};
	let files = $state([] as ListedFile[]);
	let drawerStatus = $state(filesDrawer.isOpen);
	const closeDrawer = () => filesDrawer.close();

	let onlyStars = $state(true);

	function listFiles<T extends Record<string, unknown> = Record<string, never>>(
		extra: T = {} as T
	) {
		const files = filesDb.scan();
		const out: Array<ListedFile & T> = [];
		for (const [id, item] of files) {
			const isStarred = starredIds.includes(id);
			if (!onlyStars || isStarred) {
				out.push({ ...item, isStarred, id, ...extra });
			}
		}
		return out;
	}

	$effect(() => {
		drawerStatus = filesDrawer.isOpen;
		if (filesDrawer.isOpen) {
			files = listFiles();
		}
	});

	function removeItem(key: string) {
		const id = asStorageId(key);
		filesDb.delete(id);
		files = listFiles();
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
		return () => {
			filesDrawer.close();
			const mixture = deserializeFromLocalStorage(id);
			if (mixture && mixture.isValid) {
				mixtureStore.addComponentTo(filesDrawer.parentId, { name, component: mixture });
			}
		};
	}

	function handleExport() {
		// download a json file with all the starred files
		const data = listFiles({}).filter((f) => f.isStarred);
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
					const id = asStorageId(item.id);
					filesDb.set(id, item);
				}
				files = listFiles();
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
			{#each files as { name, id, isStarred, desc }}
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
							{#if isStarred}
								<StarSolid size="xs" />
							{:else}
								<StarOutline size="xs" />
							{/if}
							<span class="text-primary-800 dark:text-primary-400 font-medium">{name}</span>
						</div>
						<span class="text-xs text-primary-800 dark:text-primary-400">{desc}</span>
					</div>
					<div class="flex flex-row justify-around">
						<Tooltip color="default" offset={6} triggeredBy={`#${domIdFor('remove', id)}`}>
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
