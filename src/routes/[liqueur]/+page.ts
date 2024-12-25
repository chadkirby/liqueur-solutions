import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { deserializeFromUrl } from './deserialize.js';
import { generateStorageId } from '$lib/storage-id.js';
import { filesDb, type StoredFileData } from '$lib/storage.svelte.js';

export async function load(args: { url: URL; params: { liqueur: string } }): Promise<never> {
	const { url, params } = args;
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
		await filesDb.write(item);
	}
	// throws { status: 303, redirect: `/file/${item.id}` }
	throw redirect(303, `/file/${item.id}`);
}
