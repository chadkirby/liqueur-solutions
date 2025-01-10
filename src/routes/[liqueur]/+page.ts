import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { deserializeFromUrl } from './deserialize.js';
import { generateStorageId } from '$lib/storage-id.js';
import type { StoredFileData } from '$lib/storage.svelte.js';

export async function load(args: { url: URL; params: { liqueur: string } }): Promise<never> {
	const { url, params } = args;
	try {
		const { name, mixture } = deserializeFromUrl(url.searchParams);
		if (!mixture.isValid) throw new Error('Invalid mixture');

		const item: StoredFileData = {
			id: generateStorageId(),
			accessTime: Date.now(),
			name: decodeURIComponent(params.liqueur) || '',
			desc: mixture.describe(),
			mixture: { name, data: mixture.toStorageData() }
		};

		if (browser) {
			const { filesDb } = await import('$lib/storage.svelte.js');
			await filesDb.write(item);
		}
		throw redirect(303, `/file/${item.id}`);
	} catch (err) {
		if (err instanceof Error && 'status' in err) throw err;
		console.error(err);
		throw redirect(303, `/new`);
	}
}
