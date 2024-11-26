<script lang="ts">
	import { FileOutline } from 'flowbite-svelte-icons';
	import { Tooltip } from 'svelte-5-ui-lib';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	function newFile() {
		goto('/new', { replaceState: true, invalidateAll: true });
	}

	if (browser) {
		// listen for cmd+n or ctrl+n to create a new mixture
		window.addEventListener('keydown', (event) => {
      console.log(event.key)
			if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
				event.preventDefault();
				newFile();
			}
		});
	}
</script>

<Tooltip color="default" offset={6} triggeredBy="#new-button">Create a new mixture</Tooltip>
<FileOutline id="new-button" class="text-white" onclick={newFile} />
