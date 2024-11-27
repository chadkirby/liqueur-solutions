<script lang="ts">
	import type { LoadDataFromStore } from '$lib/load-data.js';
	import MixtureList from '../../components/MixtureList.svelte';
	import BottomNav from '../../components/nav/BottomNav.svelte';

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
