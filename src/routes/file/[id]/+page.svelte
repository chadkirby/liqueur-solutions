<script lang="ts">
	import { browser } from '$app/environment';
	import { mixtureStore } from '$lib';
	import { deserializeFromLocalStorage } from '$lib/deserialize.js';
	import type { LoadDataFromStore } from '$lib/load-data.js';
	import { getName } from '$lib/local-storage.svelte.js';
	import MixtureList from '../../../components/MixtureList.svelte';
	import BottomNav from '../../../components/nav/BottomNav.svelte';

	interface Props {
		// This prop is populated with the returned data from the load function
		data: LoadDataFromStore;
	}

	let { data }: Props = $props();
	const storeId = data.storeId;

	let title = $state('Liqueur Solutions');

	if (browser) {
		$effect(() => {
			try {
				const mixture = deserializeFromLocalStorage(storeId);
				if (!mixture.isValid) throw new Error('Invalid mixture');
				const name = getName(storeId) || 'mixture';
				mixtureStore.load({ storeId, name, mixture });
				title = name;
			} catch (error) {
				console.error(error);
				throw error;
			}
		});
	}

</script>

<svelte:head>
    <title>{title}</title>
</svelte:head>


<div class="p-4 max-w-lg mx-auto font-sans">
	<MixtureList {storeId} />
	<BottomNav />
</div>
