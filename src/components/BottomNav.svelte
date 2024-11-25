<script lang="ts">
	import AddComponent from './AddComponentButton.svelte';
	import { BottomNav, BottomNavItem } from 'svelte-5-ui-lib';
	import ShareModal from './ShareModal.svelte';
	import FilesDrawer from './FilesDrawer.svelte';
	import SaveButton from './SaveButton.svelte';
	import NewButton from './NewButton.svelte';

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
	<BottomNavItem btnName="Files" {btnClass}>
		<FilesDrawer />
	</BottomNavItem>

  <BottomNavItem btnName="New" {btnClass}>
		<NewButton />
	</BottomNavItem>

  <BottomNavItem btnName="Add component" btnClass={btnClass.replace(/secondary/g, 'primary')}>
		<AddComponent />
	</BottomNavItem>

	<BottomNavItem btnName="Share" {btnClass}>
		<ShareModal />
	</BottomNavItem>
</BottomNav>
