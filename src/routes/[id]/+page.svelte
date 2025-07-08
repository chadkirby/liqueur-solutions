<script lang="ts">
	import { goto } from '$app/navigation';
	import { persistenceContext } from '$lib/persistence.js';
	import { generateStorageId } from '$lib/storage-id.js';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { deserializeFromUrl } from '$lib/url-serialization.js';


	onMount(async () => {
		const pathname = decodeURIComponent(page.url.pathname.split('/').pop() || '');
		const { mixture, name } = deserializeFromUrl(page.url.searchParams, pathname);
		if (!mixture.isValid) throw new Error("Can't load invalid mixture");

		const id = generateStorageId();
		await persistenceContext.isReady();
		await persistenceContext.upsertMx({
			id,
			name,
			mixture,
			starred: false,
		});
		await persistenceContext.isReady();
		goto(`/${id}/edit`, { replaceState: true });
	});
</script>

<p>Creating new mixture...</p>
