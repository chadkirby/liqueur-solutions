<script lang="ts">
	import { deserializeFromStorage, getName } from '$lib/files-db.js';
	import { getTotals } from '$lib/utils.js';
	import type { LoadData } from './types.js';
	import MixtureList from '../../../components/MixtureList.svelte';
	import BottomNav from '../../../components/nav/BottomNav.svelte';
	import { loadingStoreId, MixtureStore } from '$lib/mixture-store.svelte.js';
	import { Spinner } from 'svelte-5-ui-lib';
	import { filesDb } from '$lib/files-db.js';
	import { onMount, onDestroy } from 'svelte';
	import { currentDataVersion } from '$lib/data-format.js';

	interface Props {
		data: LoadData;
	}

	let { data }: Props = $props();
	const { storeId } = data;

	// State for the fetched data and loading status
	let mixtureName = $state<string>('');
	let isLoading = $state<boolean>(true);
	let error = $state<string | null>(null);
	let mixtureStore = $state<MixtureStore | null>(null);
	let title = $derived(`${mixtureName || 'Loading...'} - Liqueur Solutions`);

	// Load data on component mount
	onMount(() => {
		if (storeId === loadingStoreId || !storeId) {
			isLoading = false;
			error = 'Invalid or missing mixture ID.';
			return;
		}
		let isCancelled = false;
		isLoading = true;
		error = null;
		mixtureName = '';
		mixtureStore = null;

		async function fetchData() {
			try {
				console.log(`Fetching data for storeId: ${storeId}`);
				const fetchedMixture = await deserializeFromStorage(storeId);
				if (isCancelled) return;
				if (!fetchedMixture.isValid) throw new Error('Invalid mixture data loaded.');
				const fetchedName = await getName(storeId);
				if (isCancelled) return;
				const fetchedTotals = getTotals(fetchedMixture);
				if (isCancelled) return;
				// Update state
				mixtureName = fetchedName || 'mixture';
				// Initialize MixtureStore
				mixtureStore = new MixtureStore(
					{
						storeId,
						name: mixtureName,
						mixture: fetchedMixture,
						totals: fetchedTotals,
					},
					{
						onUpdate(updatedData) {
							const updatedMixture = updatedData.mixture;
							filesDb.write({
								version: currentDataVersion,
								id: updatedData.storeId,
								accessTime: Date.now(),
								name: updatedData.name,
								desc: updatedMixture.describe(),
								rootMixtureId: updatedMixture.id,
								ingredientDb: updatedMixture.serialize(),
							});
						},
					},
				);
			} catch (err: any) {
				if (isCancelled) return;
				console.error(`Error loading mixture ${storeId}:`, err);
				error = `Failed to load mixture: ${err.message}`;
			} finally {
				if (!isCancelled) {
					isLoading = false;
				}
			}
		}

		fetchData();
		return () => {
			isCancelled = true;
			console.log(`Cleanup fetch for storeId: ${storeId}`);
		};
	});

	onDestroy(() => {
		// no-op
	});
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<div class="p-2 max-w-2xl mx-auto font-sans">
	{#if isLoading}
		<!-- Show spinner ONLY while actively loading -->
		<div class="flex h-full items-center justify-center p-10">
			<Spinner size="16" /> Loading Mixture...
		</div>
	{:else if error}
		<!-- Show error message if loading finished with an error -->
		<div class="p-4 text-red-600">Error: {error}</div>
	{:else if mixtureStore}
		<!-- Show content only if loading finished successfully AND mixtureStore is created -->
		<MixtureList {mixtureStore} />
		<BottomNav {mixtureStore} />
	{:else}
		<!-- Fallback if loading finished, no error, but mixtureStore is still null -->
		<div class="p-4 text-gray-500">Mixture data could not be initialized. (ID: {storeId})</div>
	{/if}
</div>
