<script lang="ts">
	import { dataToMixture } from '$lib/index.svelte';
	import type { LoadDataFromUrl } from '$lib/load-data.js';
	import { type FileItem } from '$lib/local-storage.svelte';
	import { urlEncode } from '$lib/mixture-store.svelte.js';
	import { generateStorageId } from '$lib/storage-id.js';
	import NewMixture from '../../components/NewMixture.svelte';

	interface Props {
		// This prop is populated with the returned data from the load function
		data: LoadDataFromUrl;
	}

	let { data }: Props = $props();

	const name = data.liqueur;
	const mixture = dataToMixture(data);
	const href = urlEncode(name, mixture);

	const item: FileItem = {
		id: generateStorageId(),
		accessTime: Date.now(),
		name,
		desc: mixture.describe(),
		href
	}

</script>

<NewMixture {item} />
