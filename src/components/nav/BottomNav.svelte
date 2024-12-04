<script lang="ts">
	import ShareModal from './ShareModal.svelte';
	import FilesDrawer from './FilesDrawer.svelte';
	import { filesDrawer } from '$lib/files-drawer-store.svelte';
	import { Tooltip } from 'svelte-5-ui-lib';
	import { FileOutline, ArrowUpFromBracketOutline } from 'flowbite-svelte-icons';
	import { goto } from '$app/navigation';
	import { shareModal } from '$lib/share-modal-store.svelte';

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

<div
	class="
		w-full
		z-30
		border-primary-200
		dark:bg-primary-700
		dark:border-primary-600
		fixed
		h-16
		max-w-lg
		-translate-x-1/2
		rtl:translate-x-1/2
		bg-white
		border
		rounded-full
		bottom-4
		start-1/2
		"
>
	<div class="h-full max-w-lg mx-auto flex items-center justify-around">
		<button
			id="file-drawer-button"
			aria-label="Files"
			class={btnClass}
			onclick={openFilesDrawer}
			onkeydown={handleKeydown}
		>
			<FilesDrawer />
		</button>

		<button
			id="new-button"
			aria-label="New"
			class={btnClass}
			onclick={() => goto('/new', { replaceState: true, invalidateAll: true })}
		>
			<FileOutline class="text-white" />
		</button>

		<button
			id="share-button"
			aria-label="Share"
			class={btnClass}
			onclick={shareModal.open}
		>
			<ArrowUpFromBracketOutline class="text-white" />
		</button>
	</div>
</div>

<ShareModal />

<Tooltip color="default" offset={6} triggeredBy="#new-button">Create a new mixture</Tooltip>
<Tooltip color="default" offset={6} triggeredBy="#file-drawer-button">
	Show saved mixture files
</Tooltip>
<Tooltip color="default" offset={6} triggeredBy="#share-button">Share the current mixture</Tooltip>
