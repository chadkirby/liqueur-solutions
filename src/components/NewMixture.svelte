<script lang="ts">
	import { goto } from '$app/navigation';
  import { browser } from '$app/environment';

	import { filesDb, type FileItem } from '$lib/local-storage.js';
	interface Props {
		item: FileItem;
	}

	let { item }: Props = $props();

	if (browser) {
		filesDb.write(item);
		goto(`/file?id=${item.id}`);
	}
</script>
