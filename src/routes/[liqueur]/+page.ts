import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { deserializeFromUrl } from '$lib/url-serialization.js';
import { generateStorageId } from '$lib/storage-id.js';
import { filesDb } from '$lib/files-db.js';
import {
	currentDataVersion,
	getIngredientHash,
	type DeserializedFileDataV1,
} from '$lib/data-format.js';

export async function load(args: { url: URL; params: { liqueur: string } }): Promise<never> {
	const { url, params } = args;
	const { mixture } = deserializeFromUrl(url.searchParams);
	if (!mixture.isValid) throw new Error("Can't load invalid mixture");

	const name = decodeURIComponent(params.liqueur) || '';

	const item: DeserializedFileDataV1 = {
		version: currentDataVersion,
		id: generateStorageId(),
		accessTime: Date.now(),
		name,
		desc: mixture.describe(),
		rootMixtureId: mixture.id,
		ingredientDb: mixture.serialize(),
		_ingredientHash: mixture.getIngredientHash(name),
	};

	if (browser) {
		await filesDb.init();
		await filesDb.write(item);
	}
	// throws { status: 303, redirect: `/edit/${item.id}` }
	throw redirect(303, `/edit/${item.id}`);
}
