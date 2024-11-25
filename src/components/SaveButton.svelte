<script lang="ts">
	import Portal from 'svelte-portal';
	import { Button, Toast, Tooltip } from 'svelte-5-ui-lib';
	import { FloppyDiskAltSolid, FloppyDiskAltOutline } from 'flowbite-svelte-icons';
	import { mixtureStore } from '$lib';

	let toastStatus = $state(false);
  let isSaved = $derived(!$mixtureStore.isDirty);
  let title = $derived($mixtureStore.name);
  let tooltip = $derived(title ? isSaved ? 'No changes to save' : 'Save the current mixture' : 'Enter a title to save'
  );

	function save(e: Event) {
    if (title) {
		e.preventDefault();
		mixtureStore.save();
		toastStatus = true;
		setTimeout(() => {
			toastStatus = false;
		}, 3000);}
	}
</script>

<Portal target="body">
	<Toast bind:toastStatus position="bottom-left" baseClass="-translate-y-16">Saved</Toast>
</Portal>

<Tooltip color="default" offset={6} triggeredBy="#save-button">{tooltip}</Tooltip>

<Button
	id="save-button"
	class="p-1"
	outline
	color="light"
	onclick={save}
	disabled={isSaved}
>
	{#if isSaved}
  <FloppyDiskAltOutline class="text-gray-200" />
	{:else}
  <FloppyDiskAltSolid class="text-gray-500" />
	{/if}
</Button>
