<script lang="ts">
	import { getTotals } from '$lib/utils.js';
	import MixtureList from '../../../components/MixtureList.svelte';
	import BottomNav from '../../../components/nav/BottomNav.svelte';
	import { MixtureStore } from '$lib/mixture-store.svelte.js';
	import { Spinner } from 'svelte-5-ui-lib';
	import { onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { deserializeFromStorage, getName, writeTempFile } from '$lib/persistence.svelte.js';

	// UI state
	let mixtureName = $state<string>('');
	let isLoading = $state<boolean>(true);
	let error = $state<string | null>(null);
	let mixtureStore = $state<MixtureStore | null>(null);
	let unsubscribeMixture: (() => void) | null = null;
	let cancelCurrent: (() => void) | null = null;

	function startFetch() {
		const id = page.params.id;
		let cancelled = false;
		isLoading = true;
		error = null;
		mixtureName = '';
		mixtureStore = null;
		console.log('fetching mixture', id);

		(async () => {
			try {
				const fetched = await deserializeFromStorage(id);
				if (cancelled) return;
				if (!fetched.isValid) throw new Error('Invalid mixture data loaded.');

				const name = await getName(id);
				if (cancelled) return;

				const totals = getTotals(fetched);
				if (cancelled) return;

				mixtureName = name || 'mixture';
				mixtureStore = new MixtureStore({
					storeId: id,
					name: mixtureName,
					mixture: fetched,
					totals,
					ingredientHash: fetched.getIngredientHash(mixtureName),
				});

				unsubscribeMixture = mixtureStore.subscribe((upd) => {
					writeTempFile({
						id: upd.storeId,
						name: upd.name,
						mixture: upd.mixture,
					});
				});
			} catch (err: any) {
				if (cancelled) return;
				console.error(`Error loading mixture ${id}:`, err);
				error = `Failed to load mixture: ${err.message}`;
			} finally {
				isLoading = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	}

	$effect(() => {
		const currentStoreId = mixtureStore ? mixtureStore.storeId : null;
		// refetch if the URL changes
		if (page.params.id !== currentStoreId) {
			cancelCurrent = startFetch();
		}
	});

	onDestroy(() => {
		cancelCurrent?.();
		unsubscribeMixture?.();
	});
</script>

<svelte:head>
	<title>{mixtureName ? `${mixtureName} – Liqueur Solutions` : 'Loading…'}</title>
</svelte:head>

<div class="p-2 max-w-2xl mx-auto font-sans">
	{#if isLoading}
		<div class="flex h-full items-center justify-center p-10">
			<Spinner size="16" /> Loading Mixture…
		</div>
	{:else if error}
		<div class="p-4 text-red-600">Error: {error}</div>
	{:else if mixtureStore}
		<MixtureList {mixtureStore} />
		<BottomNav {mixtureStore} />
	{:else}
		<div class="p-4 text-gray-500">
			Mixture data could not be initialized. (ID: {page.params.id})
		</div>
	{/if}
</div>
