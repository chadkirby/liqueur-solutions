<script lang="ts">
	import { dataToMixture } from '$lib';
	import type { LoadDataFromUrl } from '$lib/load-data.js';
	import { type FileItem } from '$lib/local-storage.svelte';
	import { urlEncode } from '$lib/mixture-store.js';
	import { generateStorageId } from '$lib/storage-id.js';
	import NewMixture from '../../components/NewMixture.svelte';

	interface Props {
		// This prop is populated with the returned data from the load function
		data: LoadDataFromUrl;
	}

	const { data }: Props = $props();

	const mixture = dataToMixture(data);
	const name = `Untitled Mixture`;


	const item: FileItem = ({
		id: generateStorageId(),
		accessTime: Date.now(),
		name,
		desc: mixture.describe(),
		href: urlEncode(name, mixture)
	});

</script>

<NewMixture {item} />
