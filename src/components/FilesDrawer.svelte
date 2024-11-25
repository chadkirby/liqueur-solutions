<script lang="ts">
	import { Drawer, uiHelpers, Drawerhead, A, Tooltip } from 'svelte-5-ui-lib';
	import { CloseCircleSolid, ListOutline } from 'flowbite-svelte-icons';
	import Portal from 'svelte-portal';
	import { asLocalStorageId, filesDb, listFiles, type FileItem } from '$lib/local-storage';
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
			<div class="flex items-center gap-2">
					<CloseCircleSolid
          role="button"
          size="sm"
          onclick={() => removeItem(id)}
          />

				<A {href} class="font-medium hover:underline" onclick={closeDrawer}>{name} ({desc})</A>
			</div>
		{/each}
	</Drawer>
</Portal>
