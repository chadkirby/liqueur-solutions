<script lang="ts">
	import { getTotals } from '$lib/utils.js';
	import MixtureList from '../../../components/MixtureList.svelte';
	import BottomNav from '../../../components/nav/BottomNav.svelte';
	import { MixtureStore } from '$lib/mixture-store.svelte.js';
	import { page } from '$app/state';

	import { onDestroy, onMount, setContext, untrack } from 'svelte';
	import { Mixture } from '$lib/mixture.js';
	import { persistenceContext } from '$lib/persistence.js';
	import { getIngredientHash } from '$lib/data-format.js';
	import { MIXTURE_STORE_CONTEXT_KEY, type MixtureStoreContext } from '$lib/contexts.js';
	import type { ServerLoadData } from './types.js';

	// UI state
	let mixtureName = $state<string>('');
	let unsubscribeMixture: (() => void) | null = null;
	let persistenceReady = $state(false);

	// Get server data from page data (now directly from +page.server.ts)
	const serverData = $derived(page.data as ServerLoadData);

	// Function to sync server data with local collections
	async function syncServerData(data: ServerLoadData) {
		if (!data.serverMixture) {
			return; // No server mixture data to sync
		}

		await persistenceContext.isReady();

		// Check if server data is newer than local data
		const localMixture = persistenceContext.mixtureFiles?.findOne(
			{ id: data.storeId },
			{ reactive: false },
		);

		const localIngredientsCollection = persistenceContext.getIngredientsCollection(data.storeId);
		await localIngredientsCollection?.isReady();
		const localIngredients = localIngredientsCollection?.find({}).fetch() ?? [];

		console.log('Comparing local and server mixture data for:', data.storeId, {
			localUpdated: localMixture?.updated,
			serverUpdated: data.serverMixture.updated,
			localIngredientCount: localIngredients.length,
			serverIngredientCount: data.serverIngredients?.length ?? 0,
		});

		const shouldUpdate =
			!localMixture ||
			new Date(data.serverMixture.updated) > new Date(localMixture.updated) ||
			localIngredients.length === 0;

		if (shouldUpdate && data.serverIngredients && data.serverIngredients.length > 0) {
			console.log('Syncing server data for:', data.storeId);

			// Sync mixture metadata
			persistenceContext.mixtureFiles?.replaceOne({ id: data.storeId }, data.serverMixture, {
				upsert: true,
			});

			// Sync ingredients data if provided (controlled by same shouldUpdate flag)
			const ingredientsCollection = persistenceContext.getIngredientsCollection(data.storeId);
			if (ingredientsCollection) {
				await ingredientsCollection.isReady();

				console.log(
					'Syncing server ingredients data for:',
					data.storeId,
					data.serverIngredients.length,
					'ingredients',
				);

				// Batch update ingredients
				ingredientsCollection.batch(() => {
					for (const ingredient of data.serverIngredients!) {
						ingredientsCollection.replaceOne({ id: ingredient.id }, ingredient, { upsert: true });
					}
				});
			}
		} else {
			console.log('Local mixture data is up to date for:', data.storeId);
		}
	}

	const mixtureStoreOrErr: MixtureStore | { error: string } = $derived.by(() => {
		const mxId = page.params.id;
		const mxData = persistenceContext.mixtureFiles?.findOne({ id: mxId });
		const ingredients = persistenceContext.getIngredientsCollection(mxId)?.find({}).fetch() ?? [];
		if (!mxData) return { error: `Mixture with ID ${mxId} not found` };
		try {
			return untrack(() => {
				const { name, desc, rootIngredientId: rootMixtureId } = mxData;
				mixtureName = name;
				const mixture = Mixture.deserialize(rootMixtureId, ingredients);
				const store = new MixtureStore({
					storeId: mxId,
					name,
					mixture,
					totals: getTotals(mixture),
					ingredientHash: getIngredientHash({ name, desc }, ingredients),
				});
				setContext<MixtureStoreContext>(MIXTURE_STORE_CONTEXT_KEY, store);
				console.log('Initialized mixture store for ID', mxId, store);
				unsubscribeMixture = store.subscribe((upd) => {
					persistenceContext.upsertMx({
						id: upd.storeId,
						name: upd.name,
						mixture: upd.mixture,
						starred: mxData.starred,
					});
				});
				return store;
			});
		} catch (error) {
			console.error('Error initializing mixture store:', error);
			return { error: error instanceof Error ? error.message : 'Unknown error' };
		}
	});
	const mixtureStore = $derived('error' in mixtureStoreOrErr ? null : mixtureStoreOrErr);
	const error = $derived('error' in mixtureStoreOrErr ? mixtureStoreOrErr.error : null);

	onMount(async () => {
		await persistenceContext.isReady();
		// Sync server data first if available
		if (serverData.serverMixture) {
			await syncServerData(serverData);
		}
		persistenceReady = true;
	});

	onDestroy(() => {
		unsubscribeMixture?.();
	});
</script>

<svelte:head>
	<title>{mixtureName ? `${mixtureName} – Liqueur Solutions` : 'Loading…'}</title>
</svelte:head>

<div class="p-2 max-w-2xl mx-auto font-sans">
	{#if !persistenceReady}
		<div class="p-4 text-gray-600">Loading mixture…</div>
	{:else if error}
		<div class="p-4 text-red-600">Error: {error}</div>
		<div class="p-4">
			<a href="/new" class="text-blue-600 hover:underline">Create a new mixture</a>
		</div>
	{:else if mixtureStore}
		<MixtureList {mixtureStore} />
		<BottomNav {mixtureStore} />
	{/if}
</div>
