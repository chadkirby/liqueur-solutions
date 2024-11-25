<script lang="ts">
	import { FileOutline } from 'flowbite-svelte-icons';
	import { Tooltip } from 'svelte-5-ui-lib';
	import { goto } from '$app/navigation';

  function newFile() {
    goto('/new', {replaceState: true, invalidateAll: true});
  }

</script>

<Tooltip
  color="default"
  offset={6}
  triggeredBy="#new-button"
>
Create a new mixture
</Tooltip>
<FileOutline
	id="new-button"
	class="text-white"
	onclick={newFile}
/>
