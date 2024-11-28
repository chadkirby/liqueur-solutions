<script lang="ts">
	import { Drawer, Drawerhead, Tooltip } from 'svelte-5-ui-lib';
	import { CloseCircleSolid, ListOutline, ArrowRightAltSolid } from 'flowbite-svelte-icons';
	import Portal from 'svelte-portal';
	import {
		asLocalStorageId,
		filesDb,
		listFiles,
		type FileItem,
		type LocalStorageId,
	} from '$lib/local-storage';
	import { deserializeFromLocalStorage } from '$lib/deserialize.js';
	import { mixtureStore } from '$lib';
	import { filesDrawer } from '$lib/files-drawer-store';

	const drawer = $filesDrawer;
	let drawerStatus = $state(false);
	let files = $state([] as FileItem[]);
	const closeDrawer = drawer.close;
	$effect(() => {
		drawerStatus = drawer.isOpen;
		if (drawerStatus) {
			files = listFiles();
		}
	});

	function removeItem(key: string) {
		const id = asLocalStorageId(key);
		filesDb.delete(id);
		files = listFiles();
	}

	function domIdFor(key: string, id: LocalStorageId) {
		return `files-drawer-${key}-${id.slice(1)}`;
	}

	const goToFile = (id: LocalStorageId) => {
		return () => {
			drawer.close();
			// client-side navigation does not work???
			// goto(`/file?id=${id}`, { replaceState: true, invalidateAll: true });
			window.location.href = `/file?id=${id}`;
		};
	};

	function addToMixture(id: LocalStorageId, name: string) {
		return () => {
			drawer.close();
			const mixture = deserializeFromLocalStorage(id);
			if (mixture && mixture.isValid) {
				mixtureStore.addComponents([{ name, id: 'mixture', component: mixture }]);
			}
		};
	}
</script>

<Tooltip color="default" offset={6} triggeredBy="#file-drawer-button">
	Show saved mixture files
</Tooltip>
<ListOutline id="file-drawer-button" class="text-white" onclick={drawer.toggle} />

<Portal target="body">
	<Drawer {drawerStatus} {closeDrawer} backdrop={true} class="flex flex-col h-full p-0">
		<div class="sticky top-0 bg-white border-b border-gray-200 z-10">
			<Drawerhead onclick={closeDrawer}>
				<h5
					id="drawer-label"
					class="
						inline-flex
						items-center
						p-4
						text-lg
						font-semibold
						text-gray-500 dark:text-gray-400"
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
						Open {name}
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
