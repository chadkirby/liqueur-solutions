import type { Mixture } from '$lib/mixture.js';
import type { StorageId } from '$lib/storage-id.js';
import type { Analysis } from '$lib/utils.js';
import type { FilesDb } from '$lib/storage.svelte.js';

export type LoadData = {
	storeId: StorageId;
	mixture: Mixture | null;
	name: string;
	totals: Analysis | null;
	filesDb: FilesDb | null;
};
