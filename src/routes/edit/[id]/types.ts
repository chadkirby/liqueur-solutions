import type { MixtureAnalysis } from '$lib/mixture-types.js';
import type { Mixture } from '$lib/mixture.js';
import type { StorageId } from '$lib/storage-id.js';

export type LoadData = {
	storeId: StorageId;
	mixture: Mixture | null;
	name: string;
	totals: MixtureAnalysis | null;
};
