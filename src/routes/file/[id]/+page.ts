import type { LoadDataFromStore } from '$lib/load-data.js';
import { isStorageId } from '$lib/storage-id.js';

export function load(args: { params: { id: string } }): LoadDataFromStore {
	const { params } = args;
	const storeId = `/${params.id}`;
	if (!storeId) throw new Error('No id');
	if (!isStorageId(storeId)) throw new Error('Bad id');

	return {
		storeId
	};
}
