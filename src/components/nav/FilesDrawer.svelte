<script lang="ts">
	import { Drawer, Drawerhead, Tooltip } from 'svelte-5-ui-lib';
	import { CloseCircleSolid, ListOutline, ArrowRightOutline, ArrowUpRightFromSquareOutline } from 'flowbite-svelte-icons';
	import Portal from 'svelte-portal';
	import { filesDb, type FileItem } from '$lib/local-storage.svelte';
	import { deserializeFromLocalStorage } from '$lib/deserialize.js';
	import { mixtureStore } from '$lib';
	import { filesDrawer } from '$lib/files-drawer-store.svelte';
	import { asStorageId, type StorageId } from '$lib/storage-id.js';
	import { openFile, openFileInNewTab } from '$lib/open-file.js';
	import { starredIds } from '$lib/stars.svelte.js';
	import Button from '../ui-primitives/Button.svelte';

	let files = $state([] as FileItem[]);
	let drawerStatus = $state(filesDrawer.isOpen);
	const closeDrawer = () => filesDrawer.close();

	function listFiles<T extends Record<string, unknown> = Record<string, never>>(
		extra: T = {} as T
	): Array<FileItem & T> {
		const files = filesDb.scan();
		const out: Array<FileItem & T> = [];
		for (const [id, item] of files) {
			if (starredIds.includes(id)) {
				out.push({ ...item, id, ...extra });
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
</script>

<ListOutline class="text-white" onclick={filesDrawer.toggle} />

<Portal target="body">
	<Drawer {drawerStatus} {closeDrawer} backdrop={true} class="flex flex-col h-full p-0">
		<div class="
			sticky
			top-0
			bg-white
			border-primary-200
			dark:bg-primary-700
			dark:border-primary-600
			border-b
			z-10">
			<Drawerhead onclick={closeDrawer}>
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
			</Drawerhead>
		</div>

		<div class="flex-1 overflow-y-auto px-4 mt-2">
			{#each files as { name, id, desc }}
				<div class="
					flex flex-col
					pb-1
					border-b-secondary-200
					dark:border-b-primary-600
					border-b-2
					">
					<div
						class="
							flex flex-col
							items-start
							mb-1
							cursor-pointer
							w-full
							text-sm
						"
					>
						<span class="text-primary-800 dark:text-primary-400 font-medium">{name}</span>
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
		</div>
	</Drawer>
</Portal>
