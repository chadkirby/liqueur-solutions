<script lang="ts">
  import AddComponent from './AddComponent.svelte';
	import {
	ArrowUpFromBracketOutline,
		ListOutline,
	} from 'flowbite-svelte-icons';
	import {
		BottomNav,
		BottomNavItem,
	} from 'svelte-5-ui-lib';
	import ShareModal from './ShareModal.svelte';

</script>


<BottomNav
	position="absolute"
	navType="application"
	innerClass="
  flex
  items-center
  justify-around
"
>
	<BottomNavItem
		btnName="Files"
		btnClass="inline-flex items-center justify-center w-10 h-10 font-medium bg-secondary-600 rounded-full hover:bg-secondary-700 group focus:ring-4 focus:ring-secondary-300 focus:outline-none dark:focus:ring-secondary-800"
	>
		<ListOutline
			class="text-white"
			onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
		/>
	</BottomNavItem>

	<BottomNavItem
		btnName="Add component"
		btnClass="inline-flex items-center justify-center w-10 h-10 bg-primary-600 rounded-full hover:bg-primary-700 group focus:ring-4 focus:ring-primary-300 focus:outline-none dark:focus:ring-primary-800"
	>
		<AddComponent />
	</BottomNavItem>

	<BottomNavItem
		btnName="Share"
		btnClass="inline-flex items-center justify-center w-10 h-10 font-medium bg-secondary-600 rounded-full hover:bg-secondary-700 group focus:ring-4 focus:ring-secondary-300 focus:outline-none dark:focus:ring-secondary-800"
	>
    <ShareModal />
	</BottomNavItem>
</BottomNav>
