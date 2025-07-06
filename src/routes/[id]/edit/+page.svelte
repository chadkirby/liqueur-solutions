<script lang="ts">
	import { getTotals } from '$lib/utils.js';
	import MixtureList from '../../../components/MixtureList.svelte';
	import BottomNav from '../../../components/nav/BottomNav.svelte';
	import { MixtureStore } from '$lib/mixture-store.svelte.js';
	import { page } from '$app/state';

	import { onDestroy, setContext, untrack } from 'svelte';
	import { Mixture } from '$lib/mixture.js';
	import { persistenceContext } from '$lib/persistence.js';
	import { getIngredientHash } from '$lib/data-format.js';
	import { MIXTURE_STORE_CONTEXT_KEY, type MixtureStoreContext } from '$lib/contexts.js';

	let error = $state<string | null>(null);
	// UI state
	let mixtureName = $state<string>('');
	let unsubscribeMixture: (() => void) | null = null;

	const mixtureStore = $derived.by(() => {
		const mxId = page.params.id;
		const mxData = persistenceContext.mixtureFiles?.findOne({ id: mxId });
		const ingredients = persistenceContext.getIngredientsCollection(mxId)?.find({}).fetch() ?? [];
		if (!mxData) return null;
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
					ingredientHash: getIngredientHash({name, desc}, ingredients),
				});
				setContext<MixtureStoreContext>(MIXTURE_STORE_CONTEXT_KEY, store);
				console.log('Initialized mixture store for ID', mxId, store);
				unsubscribeMixture = store.subscribe((upd) => {
					persistenceContext.upsertMx({
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
		<div class="p-4">
			<a href="/new" class="text-blue-600 hover:underline">Create a new mixture</a>
		</div>
	{:else if mixtureStore}
		<MixtureList {mixtureStore} />
		<BottomNav {mixtureStore} />
	{:else}
		<div class="p-4 text-gray-500">
			Mixture data could not be initialized. (ID: {page.params.id})
		</div>
		<div class="p-4">
			<a href="/new" class="text-blue-600 hover:underline">Create a new mixture</a>
		</div>
	{/if}
</div>
