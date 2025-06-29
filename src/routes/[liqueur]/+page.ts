import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { deserializeFromUrl } from '$lib/url-serialization.js';
import { generateStorageId } from '$lib/storage-id.js';
import { insertFile } from '$lib/persistence.svelte.js';

export async function load(args: { url: URL; params: { liqueur: string } }): Promise<never> {
	const { url, params } = args;
	const { mixture } = deserializeFromUrl(url.searchParams);
	if (!mixture.isValid) throw new Error("Can't load invalid mixture");

	const name = decodeURIComponent(params.liqueur) || '';

	const item = {
		id: generateStorageId(),
		name,
		mixture,
	} as const;

	if (browser) {
		await insertFile(item);
	}
	// throws { status: 303, redirect: `/edit/${item.id}` }
	throw redirect(303, `/edit/${item.id}`);
}
