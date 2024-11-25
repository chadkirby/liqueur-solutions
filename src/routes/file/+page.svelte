<script lang="ts">
	import { dataToMixture, mixtureStore } from '$lib';
	import type { LoadDataFromStore } from '$lib/load-data.js';
	import MixtureList from '../../components/MixtureList.svelte';
	import BottomNav from '../../components/BottomNav.svelte';
	import { urlEncode } from '$lib/mixture-store.js';
	import { filesDb, generateLocalStorageId } from '$lib/local-storage.js';

	interface Props {
		// This prop is populated with the returned data from the load function
		data: LoadDataFromStore;
	}

	let { data }: Props = $props();
	const storeId = data.storeId;
</script>

<div class="mixtures-page max-w-lg mx-auto">
	<MixtureList {storeId} />
	<BottomNav />
</div>

<style>
	.mixtures-page {
		padding: 1rem;
	}
</style>
