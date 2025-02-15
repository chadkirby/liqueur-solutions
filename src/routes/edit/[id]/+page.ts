import { browser } from '$app/environment';
import { loadingStoreId } from '$lib/mixture-store.svelte.js';
import { deserializeFromStorage, getName } from '$lib/storage.svelte.js';
import { getTotals } from '$lib/utils.js';
import type { LoadData } from './types.js';

// ha ha ha, wish this worked
export const ssr = false;

export async function load(args: { params: { id: string } }): Promise<LoadData> {
	if (!browser) {
		return {
			storeId: loadingStoreId,
			mixture: null,
			name: '',
			totals: null
		};
	}

	const { params } = args;
	if (!params.id) throw new Error('No id');

	const storeId = params.id;
	const mixture = await deserializeFromStorage(storeId);
	if (!mixture.isValid) throw new Error('Invalid mixture');

	const name = (await getName(storeId)) || 'mixture';
	const totals = getTotals(mixture);

	return {
		storeId,
		mixture,
		name,
		totals
	};
}
