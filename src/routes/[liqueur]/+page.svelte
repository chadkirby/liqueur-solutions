<script lang="ts">
	import { goto } from '$app/navigation';
	import { PERSISTENCE_CONTEXT_KEY, type PersistenceContext } from '$lib/contexts.js';
	import { generateStorageId } from '$lib/storage-id.js';
	import { getContext, onMount } from 'svelte';
	import { page } from '$app/state';
	import { deserializeFromUrl } from '$lib/url-serialization.js';

	const persistenceContext = getContext<PersistenceContext>(PERSISTENCE_CONTEXT_KEY);

    console.log('Creating new mixture from URL params:', page.url.searchParams);

	onMount(async () => {
		const { mixture } = deserializeFromUrl(page.url.searchParams);
		if (!mixture.isValid) throw new Error("Can't load invalid mixture");

		const name = decodeURIComponent(page.params.liqueur) || '';

		const id = generateStorageId();
		await persistenceContext.mixtureFiles?.isReady();
		persistenceContext.upsertFile({
			id,
			name,
			mixture,
		});
    console.log('going to edit page with ID:', id);
		goto(`/edit/${id}`, { replaceState: true });
	});
</script>

<p>Creating new mixture...</p>
