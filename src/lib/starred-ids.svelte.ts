import { type StorageId } from './storage-id.js';
import { SvelteMap } from 'svelte/reactivity';

type StarredIdEntry = {
	readonly ingredientHash: string;
};

// --- Starred IDs State ---
export const cloudStoredIds = new SvelteMap<StorageId, StarredIdEntry>();

export function setCloudStoredIds(ids: [StorageId, StarredIdEntry][]): void {
	cloudStoredIds.clear();
	for (const [id, entry] of ids) {
		cloudStoredIds.set(id, entry);
	}
}
