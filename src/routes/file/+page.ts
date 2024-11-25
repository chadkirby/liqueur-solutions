import { isLocalStorageId } from '$lib/local-storage.js';
import type { LoadDataFromStore } from '$lib/load-data.js';

export function load(args: { url: URL }): LoadDataFromStore {
	const { url } = args;
	const storeId = url.searchParams.get('id');
	if (!storeId) throw new Error('No id');
	if (!isLocalStorageId(storeId)) throw new Error('Bad id');

	return {
		storeId
	};
}
