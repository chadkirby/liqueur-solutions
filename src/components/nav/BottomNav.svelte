<script lang="ts">
	import ShareModal from './ShareModal.svelte';
	import FilesDrawer from './FilesDrawer.svelte';
	import { filesDrawer } from '$lib/files-drawer-store.svelte';
	import { Tooltip } from 'svelte-5-ui-lib';
	import {
		FileOutline,
		ArrowUpFromBracketOutline,
		FileCopyOutline,
		UndoOutline,
		RedoOutline
	} from 'flowbite-svelte-icons';
	import { goto } from '$app/navigation';
	import { shareModal } from '$lib/share-modal-store.svelte';
	import { MixtureStore, urlEncode } from '$lib/mixture-store.svelte.js';

	interface Props {
		mixtureStore: MixtureStore;
	}

	let { mixtureStore }: Props = $props();
	let disableUndo = $derived(mixtureStore.undoCount === 0);
	let disableRedo = $derived(mixtureStore.redoCount === 0);

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

<nav
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
	<section class="h-full max-w-lg mx-auto flex items-center justify-around">
		<button
			id="file-drawer-button"
			aria-label="Files"
			class={btnClass}
			onclick={openFilesDrawer}
			onkeydown={handleKeydown}
		>
			<FilesDrawer {mixtureStore} />
		</button>

		<section class="flex flex-row gap-4">
			<button
				id="undo-button"
				disabled={disableUndo}
				aria-label="Undo"
				class={btnClass}
				onclick={() => mixtureStore.undo()}
			>
				<UndoOutline class={disableUndo ? "text-primary-500" : "text-primary-100"} />
			</button>

			<button
				id="redo-button"
				aria-label="Redo"
				disabled={disableRedo}
				class={btnClass}
				onclick={() => mixtureStore.redo()}
			>
				<RedoOutline class={disableRedo ? "text-primary-500" : "text-primary-100"} />
			</button>
		</section>
		<section class="flex flex-row gap-4">
			<button
				id="new-button"
				aria-label="New File"
				class={btnClass}
				onclick={() => goto('/new', { replaceState: true, invalidateAll: true })}
			>
				<FileOutline class="text-primary-100" />
			</button>

			<button
				id="open-copy-button"
				aria-label="Open a copy"
				class={btnClass}
				onclick={() =>
					goto(urlEncode(mixtureStore.name, mixtureStore.mixture), {
						replaceState: true,
						invalidateAll: true
					})}
			>
				<FileCopyOutline class="text-primary-100" />
			</button>
		</section>
		<button id="share-button" aria-label="Share" class={btnClass} onclick={shareModal.open}>
			<ArrowUpFromBracketOutline class="text-primary-100" />
		</button>
	</section>
</nav>

<ShareModal {mixtureStore} />

<Tooltip color="default" offset={6} triggeredBy="#undo-button">Undo</Tooltip>
<Tooltip color="default" offset={6} triggeredBy="#redo-button">Redo</Tooltip>
<Tooltip color="default" offset={6} triggeredBy="#new-button">Create a new mixture</Tooltip>
<Tooltip color="default" offset={6} triggeredBy="#open-copy-button"
	>Open a copy of this mixture</Tooltip
>
<Tooltip color="default" offset={6} triggeredBy="#file-drawer-button">
	Show saved mixture files
</Tooltip>
<Tooltip color="default" offset={6} triggeredBy="#share-button">Share this mixture</Tooltip>
