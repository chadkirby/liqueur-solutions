import { isStorageId, type StorageId } from './storage-id.js';
import { Replicache, type WriteTransaction, type ReadonlyJSONValue } from 'replicache';
import { PUBLIC_REPLICACHE_LICENSE_KEY } from '$env/static/public';
import { type StoredFileDataV1, isV0Data, isV1Data } from '$lib/data-format.js';
import { portV0DataToV1 } from './migrations/v0-v1.js';
import { Mixture } from './mixture.js';
import { browser } from '$app/environment';
import { starredIds } from './starred-ids.svelte.js';

// Space is a logical grouping of data in Replicache
export const SPACE_FILES = 'files';
const SPACE_STARS = 'stars';

type Mutators = {
	updateFile: (tx: WriteTransaction, item: StoredFileDataV1) => Promise<void>;
	deleteFile: (tx: WriteTransaction, id: StorageId) => Promise<void>;
	addStar: (tx: WriteTransaction, id: StorageId) => Promise<void>;
	deleteStar: (tx: WriteTransaction, id: StorageId) => Promise<void>;
};

// Define our mutations
const mutators = {
	async updateFile(tx: WriteTransaction, item: StoredFileDataV1) {
		await tx.set(`${SPACE_FILES}/${item.id}`, item as ReadonlyJSONValue);
	},

	async deleteFile(tx: WriteTransaction, id: StorageId) {
		await tx.del(`${SPACE_FILES}/${id}`);
		await mutators.deleteStar(tx, id);
	},

	async addStar(tx: WriteTransaction, id: StorageId) {
		await tx.set(`${SPACE_STARS}/${id}`, true);
	},

	async deleteStar(tx: WriteTransaction, id: StorageId) {
		await tx.del(`${SPACE_STARS}/${id}`);
	},
} satisfies Mutators;

export class FilesDb {
	readonly rep: Replicache<Mutators> | null = null; // Replicache instance
	private starsUnsubscribe: (() => void) | null = null; // To store unsubscribe function

	constructor() {
		if (browser) {
			// Initialize with offline settings immediately
			try {
				this.rep = new Replicache({
					name: 'mixture-files',
					licenseKey: PUBLIC_REPLICACHE_LICENSE_KEY,
					mutators,
					pushURL: '/api/replicache/push',
					pullURL: '/api/replicache/pull',
					pushDelay: Infinity,
					pullInterval: null,
				});
				// Initialize stars subscription and store unsubscribe function
				this.starsUnsubscribe = this.rep.subscribe(
					async (tx) => {
						const stars = await tx.scan({ prefix: SPACE_STARS }).entries().toArray();
						return stars.map(([key]) => key.split('/')[1] as StorageId);
					},
					{
						onData: (stars) => {
							// Update the global reactive store
							starredIds.length = 0;
							starredIds.push(...stars);
						},
					},
				);

				console.log('FilesDb: Initial Replicache instance ready.');
			} catch (error) {
				console.error('Failed to initialize Replicache:', error);
			}
		}
	}

	startSync() {
		if (this.rep && this.rep.pullInterval === null) {
			// Only start sync if it was previously stopped
			console.log('Starting Replicache sync...');
			this.rep.pushDelay = 1000; // Set push delay to 1 second
			this.rep.pullInterval = 5 * 60 * 1000; // Set pull interval to 5 minutes
		}
	}

	stopSync() {
		console.log('Stopping Replicache sync...');
		if (this.rep) {
			this.rep.pushDelay = Infinity; // Disable push
			this.rep.pullInterval = null; // Disable pull
		}
	}

	close(): void {
		console.log('Closing FilesDb instance and Replicache...');
		this.starsUnsubscribe?.(); // Unsubscribe from stars
		this.rep?.close(); // Close Replicache
		this.starsUnsubscribe = null;
	}

	async runJanitor() {
		// Use the reactive getter for the janitor
		console.log('Running janitor task...');
		const MAX_UNSTARRED_ITEMS = 100;
		try {
			const items = await this.scan();
			const unstarredItems = Array.from(items.entries()).filter(([id]) => !starredIds.includes(id));

			if (unstarredItems.length > MAX_UNSTARRED_ITEMS) {
				console.log(
					`Janitor: Found ${unstarredItems.length} unstarred items, exceeding limit of ${MAX_UNSTARRED_ITEMS}. Cleaning up...`,
				);
				for (const [id] of unstarredItems.slice(MAX_UNSTARRED_ITEMS)) {
					console.log(`Janitor: Deleting old unstarred item ${id}`);
					await this.delete(id);
				}
			} else {
				console.log(`Janitor: Found ${unstarredItems.length} unstarred items. No cleanup needed.`);
			}
		} catch (error) {
			console.error('Janitor task failed:', error);
		}
	}

	async has(id: StorageId): Promise<boolean> {
		if (!isStorageId(id)) return false;
		const item = await this.rep?.query(async (tx) => {
			return await tx.get(`${SPACE_FILES}/${id}`);
		});
		return item !== null;
	}

	async read(id: StorageId): Promise<StoredFileDataV1 | null> {
		if (!isStorageId(id)) return null;
		const item = await this.rep?.query(async (tx) => {
			const data = await tx.get(`${SPACE_FILES}/${id}`);
			if (isV0Data(data)) {
				return portV0DataToV1(data);
			}
			return data;
		});
		return item as StoredFileDataV1 | null;
	}

	async write(item: StoredFileDataV1): Promise<void> {
		if (!isStorageId(item.id)) return;
		await this.rep?.mutate.updateFile(item);
	}

	async delete(id: StorageId): Promise<void> {
		if (!isStorageId(id)) return;
		await this.rep?.mutate.deleteFile(id);
	}

	async toggleStar(id: StorageId): Promise<void> {
		if (!isStorageId(id)) return;
		if (starredIds.includes(id)) {
			await this.removeStar(id);
		} else {
			await this.addStar(id);
		}
	}

	async addStar(id: StorageId): Promise<void> {
		if (!isStorageId(id)) return;
		if (starredIds.includes(id)) return;
		await this.rep?.mutate.addStar(id);
	}

	async removeStar(id: StorageId): Promise<void> {
		if (!isStorageId(id)) return;
		if (!starredIds.includes(id)) return;
		await this.rep?.mutate.deleteStar(id);
	}

	private async scan(
		sortBy: keyof StoredFileDataV1 = 'accessTime',
	): Promise<Map<StorageId, StoredFileDataV1>> {
		const items = await this.rep?.query(async (tx) => {
			const items = new Map<StorageId, StoredFileDataV1>();
			const starred = new Set(starredIds);

			// First get starred items
			for (const id of starred) {
				if (isStorageId(id)) {
					const item = await tx.get(`${SPACE_FILES}/${id}`);
					if (item) items.set(id, item as StoredFileDataV1);
				}
			}

			// Then get all other items
			const allItems = await tx.scan({ prefix: SPACE_FILES }).entries().toArray();
			for (const [key, item] of allItems) {
				const id = key.split('/')[1] as StorageId;
				if (!starred.has(id)) {
					items.set(id, item as StoredFileDataV1);
				}
			}

			return items;
		});

		// Sort items by the specified field
		const sortedEntries = Array.from(items?.entries() ?? []).sort(([, a], [, b]) => {
			const aVal = a[sortBy];
			const bVal = b[sortBy];
			return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
		});

		return new Map(sortedEntries);
	}

	/**
	 * Subscribe to the full set of files; fires initially and on any add/update/delete.
	 */
	subscribe(callback: (item: StoredFileDataV1, i: number) => void) {
		if (!this.rep) return null;
		return this.rep.subscribe(
			async (tx) => await tx.scan({ prefix: SPACE_FILES }).values().toArray(),
			(allItems) => {
				for (const [i, data] of allItems.entries()) {
					if (isV1Data(data)) {
						callback(data, i);
					} else if (isV0Data(data)) {
						const v1Data = portV0DataToV1(data);
						callback(v1Data, i);
					}
				}
			},
		);
	}
}

export const filesDb = new FilesDb();

/**
 * Extracts the name of a mixture from a StorageId.
 */
export async function getName(id: StorageId): Promise<string> {
	const item = await filesDb.read(id);
	return item?.name || '';
}

/**
 * Deserializes a mixture from storage.
 */
export async function deserializeFromStorage(id: string): Promise<Mixture> {
	if (!isStorageId(id)) {
		throw new Error('Invalid id');
	}
	const item = await filesDb.read(id);
	const v1Data = isV1Data(item) ? item : isV0Data(item) ? portV0DataToV1(item) : null;
	if (!v1Data) {
		throw new Error('No item found');
	}
	return Mixture.deserialize(v1Data.rootMixtureId, v1Data.ingredientDb);
}
