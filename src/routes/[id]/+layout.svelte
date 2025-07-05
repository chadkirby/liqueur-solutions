<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { getContext } from 'svelte';
	import {
		type PersistenceContext,
		createIngredientsCollection,
		PERSISTENCE_CONTEXT_KEY,
	} from '$lib/contexts.js';
	import { page } from '$app/state';
	import type { Mixture } from '$lib/mixture.js';
	import { createFileDataV2 } from '$lib/data-format.js';
	import { isStorageId } from '$lib/storage-id.js';

	const mxId = isStorageId(page.params.id) ? page.params.id : null;
	const originalContext = getContext<PersistenceContext>(PERSISTENCE_CONTEXT_KEY);
	const ingredientsCollection = mxId ? createIngredientsCollection(mxId) : null;

	setContext<PersistenceContext>(PERSISTENCE_CONTEXT_KEY, {
		...originalContext,
		ingredients: ingredientsCollection,
		upsertFile: (item: { id: string; name: string; mixture: Mixture }) => {
			if (!originalContext.mixtureFiles) return;
			const data = createFileDataV2(item);
			originalContext.mixtureFiles.replaceOne({ id: item.id }, data, { upsert: true });
			const ingredients = item.mixture.serialize();
			ingredientsCollection?.batch(() => {
				ingredientsCollection?.removeMany({
					id: { $in: ingredients.map((ing) => ing.id) },
				});
				ingredientsCollection?.insertMany(ingredients);
			});
		},
	});

	interface Props {
		children?: Snippet;
	}
	let { children }: Props = $props();
</script>

{@render children?.()}
