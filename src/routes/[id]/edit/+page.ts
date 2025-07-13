import { browser } from '$app/environment';
import { loadingStoreId } from '$lib/mixture-store.svelte.js';
import type { LoadData } from './types.js';

// ha ha ha, wish this worked
export const ssr = false;

export async function load(args: { params: { id: string } }): Promise<LoadData> {
	if (!browser) {
		return {
			storeId: loadingStoreId,
		};
	}

	const { params } = args;
	if (!params.id) throw new Error('No id');

	const storeId = params.id;

	return {
		storeId,
	};
}
