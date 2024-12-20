<script lang="ts">
	import { browser } from '$app/environment';
	import { deserializeFromLocalStorage } from '$lib/deserialize.js';
	import type { LoadDataFromStore } from '$lib/load-data.js';
	import { getName } from '$lib/local-storage.svelte.js';
	import MixtureList from '../../../components/MixtureList.svelte';
	import BottomNav from '../../../components/nav/BottomNav.svelte';
	import { getTotals, loadingStoreId, MixtureStore } from '$lib/mixture-store.svelte.js';
	import { Spinner } from 'svelte-5-ui-lib';

	interface Props {
		// This prop is populated with the returned data from the load function
		data: LoadDataFromStore;
	}

	let { data }: Props = $props();
	const storeId = data.storeId;

	let title = $state('Liqueur Solutions');
	let name = $derived.by(() => {
		let name = getName(storeId) || 'mixture';
		return name;
	});

	$inspect(storeId, name);

	let mixtureStore = $derived.by(() => {
		const mixture = deserializeFromLocalStorage(storeId);
		if (!mixture.isValid) throw new Error('Invalid mixture');
		const totals = getTotals(mixture);
		console.log('loading mixture', storeId, name, totals);
		return new MixtureStore({ storeId, name, mixture, totals });
	});

	$inspect(storeId, name, mixtureStore);
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<div class="p-2 max-w-lg mx-auto font-sans">
	{#if storeId === loadingStoreId}
		<Spinner size="16" />
	{:else}
		<MixtureList {mixtureStore} />
		<BottomNav {mixtureStore} />
	{/if}
</div>
