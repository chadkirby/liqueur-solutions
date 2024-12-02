<script lang="ts">
	import { Drawer, Drawerhead, Tooltip } from 'svelte-5-ui-lib';
	import { CloseCircleSolid, ListOutline, ArrowRightAltSolid } from 'flowbite-svelte-icons';
	import Portal from 'svelte-portal';
	import { filesDb, type FileItem } from '$lib/local-storage.svelte';
	import { deserializeFromLocalStorage } from '$lib/deserialize.js';
	import { mixtureStore } from '$lib';
	import { filesDrawer } from '$lib/files-drawer-store.svelte';
	import { asStorageId, type StorageId } from '$lib/storage-id.js';
	import { openFile, openFileInNewTab } from '$lib/open-file.js';
	import { starredIds } from '$lib/stars.svelte.js';

	let files = $state([] as FileItem[]);
	let drawerStatus = $state(false);
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
				openFile(id);}
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

<Tooltip color="default" offset={6} triggeredBy="#file-drawer-button">
	Show saved mixture files
</Tooltip>
<ListOutline id="file-drawer-button" class="text-white" onclick={filesDrawer.toggle} />

<Portal target="body">
	<Drawer {drawerStatus} {closeDrawer} backdrop={true} class="flex flex-col h-full p-0">
		<div class="sticky top-0 bg-white border-b border-primary-200 z-10">
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
			{#each files as { name, id, desc, href }}
				<div class="flex flex-row items-center gap-2">
					<Tooltip color="default" offset={6} triggeredBy={`#${domIdFor('remove', id)}`}>
						Delete {name}
					</Tooltip>
					<CloseCircleSolid
						id={domIdFor('remove', id)}
						role="button"
						size="sm"
						onclick={() => removeItem(id)}
					/>
					<Tooltip color="default" offset={6} triggeredBy={`#${domIdFor('link', id)}`}>
						Open {name} {#if modifierKey}in new tab{/if}
					</Tooltip>
					<button
						id={domIdFor('link', id)}
						class="
							flex flex-col
							items-start
							mb-2
							cursor-pointer
							w-full
							text-sm
						"
						onclick={goToFile(id)}
					>
						<span>{name}</span>
						<span>{desc}</span>
					</button>
					<Tooltip color="default" offset={6} triggeredBy={`#${domIdFor('add', id)}`}>
						Add {name} to current mixture
					</Tooltip>
					<ArrowRightAltSolid
						id={domIdFor('add', id)}
						role="button"
						size="sm"
						onclick={addToMixture(id, name)}
					/>
				</div>
			{/each}
		</div>
	</Drawer>
</Portal>
