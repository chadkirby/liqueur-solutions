<script lang="ts">
	import { goto } from '$app/navigation';
	import { PERSISTENCE_CONTEXT_KEY, type PersistenceContext } from '$lib/contexts.js';
	import { generateStorageId } from '$lib/storage-id.js';
	import { getContext, onMount } from 'svelte';
	import { page } from '$app/state';
	import { deserializeFromUrl } from '$lib/url-serialization.js';

	const persistenceContext = getContext<PersistenceContext>(PERSISTENCE_CONTEXT_KEY);

	onMount(async () => {
		const { mixture, name } = deserializeFromUrl(page.url.searchParams);
		if (!mixture.isValid) throw new Error("Can't load invalid mixture");

		const id = generateStorageId();
		await persistenceContext.mixtureFiles?.isReady();
		persistenceContext.upsertFile({
			id,
			name,
			mixture,
		});
		goto(`/edit/${id}`, { replaceState: true });
	});
</script>

<p>Creating new mixture...</p>
