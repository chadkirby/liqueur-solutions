<script lang="ts">
	import { dataToMixture } from '$lib/index.svelte';
	import type { LoadDataFromUrl } from '$lib/load-data.js';
	import { filesDb, type FileItem } from '$lib/storage.svelte';
	import { urlEncode } from '$lib/mixture-store.svelte.js';
	import { openFile } from '$lib/open-file.js';
	import { generateStorageId } from '$lib/storage-id.js';

	interface Props {
		// This prop is populated with the returned data from the load function
		data: LoadDataFromUrl;
	}

	let { data }: Props = $props();

	const name = data.name;
	const mixture = dataToMixture(data);
	const href = urlEncode(name, mixture);

	const item: FileItem = {
		id: generateStorageId(),
		accessTime: Date.now(),
		name,
		desc: mixture.describe(),
		href
	};

	filesDb.write(item);
	openFile(item.id);
</script>
