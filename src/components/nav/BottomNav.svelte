<script lang="ts">
	import { BottomNav, BottomNavItem } from 'svelte-5-ui-lib';
	import ShareModal from './ShareModal.svelte';
	import FilesDrawer from './FilesDrawer.svelte';
	import NewButton from './NewButton.svelte';
	import { filesDrawer } from '$lib/files-drawer-store.svelte';

	function openFilesDrawer() {
		filesDrawer.openWith(null);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			openFilesDrawer();
		}
	}

	const btnClass = `
  inline-flex
  items-center
  justify-center
  w-10
  h-10
  font-medium
  bg-secondary-600
  rounded-full
  hover:bg-secondary-700
  group
  focus:ring-4
  focus:ring-secondary-300
  focus:outline-none dark:focus:ring-secondary-800
  `;
</script>

<BottomNav
	position="fixed"
	navType="application"
	innerClass="
    flex
    items-center
    justify-around
  "
>
	<button type="button" onclick={openFilesDrawer} onkeydown={handleKeydown}>
		<BottomNavItem btnName="Files" {btnClass}>
			<FilesDrawer />
		</BottomNavItem>
	</button>

  <BottomNavItem btnName="New" {btnClass}>
		<NewButton />
	</BottomNavItem>

	<BottomNavItem btnName="Share" {btnClass}>
		<ShareModal />
	</BottomNavItem>
</BottomNav>
