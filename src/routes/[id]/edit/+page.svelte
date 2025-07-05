<script lang="ts">
	import { getTotals } from '$lib/utils.js';
	import MixtureList from '../../../components/MixtureList.svelte';
	import BottomNav from '../../../components/nav/BottomNav.svelte';
	import { MixtureStore } from '$lib/mixture-store.svelte.js';
	import { page } from '$app/state';

	import { getContext, onDestroy, untrack } from 'svelte';
	import { Mixture } from '$lib/mixture.js';
	import { PERSISTENCE_CONTEXT_KEY, type PersistenceContext } from '$lib/contexts.js';

	const persistenceContext = getContext<PersistenceContext>(PERSISTENCE_CONTEXT_KEY);
	let error = $state<string | null>(null);
	// UI state
	let mixtureName = $state<string>('');
	let unsubscribeMixture: (() => void) | null = null;

	const mixtureStore = $derived.by(() => {
		const id = page.params.id;
		const mxData = persistenceContext.mixtureFiles?.findOne({ id });
		const ingredients = persistenceContext.ingredients?.find({}).fetch() ?? [];
		if (!mxData) return null;
		try {
			return untrack(() => {
				const { name, rootIngredientId: rootMixtureId, _ingredientHash } = mxData;
				mixtureName = name;
				const mixture = Mixture.deserialize(rootMixtureId, ingredients);
				const store = new MixtureStore({
					storeId: id,
					name,
					mixture,
					totals: getTotals(mixture),
					ingredientHash: _ingredientHash,
				});
				console.log('Initialized mixture store for ID', id, store);
				unsubscribeMixture = store.subscribe((upd) => {
					persistenceContext.upsertFile({
						id: upd.storeId,
						name: upd.name,
						mixture: upd.mixture,
					});
				});
				return store;
			});
		} catch (err) {
			console.error('Error initializing mixture store:', err);
			error = (err as Error).message;
			return null;
		}
	});

	$inspect(mixtureStore?.name, page.params.id, mixtureStore?.mixture.id);
	onDestroy(() => {
		unsubscribeMixture?.();
	});
</script>

<svelte:head>
	<title>{mixtureName ? `${mixtureName} – Liqueur Solutions` : 'Loading…'}</title>
</svelte:head>

<div class="p-2 max-w-2xl mx-auto font-sans">
	{#if error}
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
