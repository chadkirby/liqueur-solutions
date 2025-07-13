<script lang="ts">
	import { goto } from '$app/navigation';
	import { generateStorageId } from '$lib/storage-id.js';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { deserializeFromUrl } from '$lib/url-serialization.js';
	import { persistenceContext } from '$lib/persistence.js';

	onMount(async () => {
		const { mixture, name } = deserializeFromUrl(page.url.searchParams);
		if (!mixture.isValid) throw new Error("Can't load invalid mixture");

		const id = generateStorageId();
		await persistenceContext.isReady();
		persistenceContext.upsertMx({
			id,
			name,
			mixture,
			starred: false,
		});
		goto(`/${id}/edit`, { replaceState: true });
	});
</script>

<p>Creating new mixture...</p>
