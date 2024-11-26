<script lang="ts">
	import { dataToMixture } from '$lib';
	import type { LoadDataFromUrl } from '$lib/load-data.js';
	import { workingMixtureId, type FileItem } from '$lib/local-storage.js';
	import { urlEncode } from '$lib/mixture-store.js';
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
		id: workingMixtureId,
		accessTime: Date.now(),
		name,
		desc: mixture.describe(),
		href
	}

</script>

<NewMixture {item} />
