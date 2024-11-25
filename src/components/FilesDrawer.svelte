<script lang="ts">
	import { Drawer, uiHelpers, Drawerhead, A, Tooltip, Label } from 'svelte-5-ui-lib';
	import { CloseCircleSolid, ListOutline } from 'flowbite-svelte-icons';
	import Portal from 'svelte-portal';
	import {
		asLocalStorageId,
		filesDb,
		listFiles,
		type FileItem,
		type LocalStorageId
	} from '$lib/local-storage';
	import { goto } from '$app/navigation';
	const drawer = uiHelpers();
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
			const file = files.find((f) => f.id === id);
			if (file) {
				goto(file.href);
			}
		};
	};
</script>

<Tooltip color="default" offset={6} triggeredBy="#file-drawer-button">
	Show saved mixture files
</Tooltip>
<ListOutline id="file-drawer-button" class="text-white" onclick={drawer.toggle} />

<Portal target="body">
	<Drawer {drawerStatus} {closeDrawer} backdrop={true} class="flex flex-col">
		<Drawerhead onclick={closeDrawer} class="mb-4">
			<h5
				id="drawer-label"
				class="inline-flex items-center text-lg font-semibold text-gray-500 dark:text-gray-400"
			>
				Saved Mixtures
			</h5>
		</Drawerhead>

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
				<a
					id={domIdFor('link', id)}
					class="
						flex flex-col
						items-start
						mb-2
						cursor-pointer
						w-full
						text-sm
					"
					{href}
					onclick={closeDrawer}
				>
					<span>{name}</span>
					<span>{desc}</span>
				</a>
			</div>
		{/each}
	</Drawer>
</Portal>
