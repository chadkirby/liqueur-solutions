import { dataToMixture, Mixture } from './mixture.js';
import { isStorageId, type StorageId } from './storage-id.js';
import { Replicache, type WriteTransaction, type ReadonlyJSONValue } from 'replicache';
import { PUBLIC_REPLICACHE_LICENSE_KEY } from '$env/static/public';
import { loadCorbado } from './corbado-store.js';

export type StoredComponent = {
	// Each component has a name, id, and data object that can
	// hold any JSON value
	name: string;
	id: string;
	data: {
		[key: string]: ReadonlyJSONValue;
	};
};

export type StoredMixtureData = {
	// The mixture data has a literal 'type' and an array of
	// 'components'
	type: 'mixture';
	components: Array<StoredComponent>;
};

/**
 * FileItem represents a stored mixture file. All types must be
 * compatible with Replicache's ReadonlyJSONValue.
 */
export type FileItem = {
	id: string;
	accessTime: number;
	name: string;
	desc: string;
	mixture: {
		name: string;
		data: StoredMixtureData;
	};
};

// Space is a logical grouping of data in Replicache
const SPACE_FILES = 'files';
const SPACE_STARS = 'stars';

// Keep a local cache of starred IDs
export const starredIds = $state<StorageId[]>([]);

type Mutators = {
	createFile: (tx: WriteTransaction, item: FileItem) => Promise<void>;
	updateFile: (tx: WriteTransaction, item: FileItem) => Promise<void>;
	deleteFile: (tx: WriteTransaction, id: StorageId) => Promise<void>;
	addStar: (tx: WriteTransaction, id: StorageId) => Promise<void>;
	deleteStar: (tx: WriteTransaction, id: StorageId) => Promise<void>;
};

// Define our mutations
const mutators = {
	async createFile(tx: WriteTransaction, item: FileItem) {
		await tx.set(`${SPACE_FILES}/${item.id}`, item);
	},

	async updateFile(tx: WriteTransaction, item: FileItem) {
		await tx.set(`${SPACE_FILES}/${item.id}`, item);
	},

	async deleteFile(tx: WriteTransaction, id: StorageId) {
		await tx.del(`${SPACE_FILES}/${id}`);
		await this.deleteStar(tx, id);
	},

	async addStar(tx: WriteTransaction, id: StorageId) {
		await tx.set(`${SPACE_STARS}/${id}`, true);
	},

	async deleteStar(tx: WriteTransaction, id: StorageId) {
		await tx.del(`${SPACE_STARS}/${id}`);
	}
} satisfies Mutators;

export class FilesDb {
	private rep: Replicache<Mutators>;

	constructor() {
		this.rep = new Replicache({
			name: 'mixture-files',
			licenseKey: PUBLIC_REPLICACHE_LICENSE_KEY,
			mutators,
			pushURL: '/api/replicache/push',
			pullURL: '/api/replicache/pull',
			// Default to offline mode, sync when user logs in
			pushDelay: Infinity,
			pullInterval: Infinity
		});

		// Listen for auth changes to enable/disable sync
		this.initializeSync();

		// Initialize stars subscription
		const unsubscribe = this.subscribeToStars((stars) => {
			starredIds.length = 0;
			starredIds.push(...stars);
		});

		// Clean up subscription on module unload
		if (import.meta.hot) {
			import.meta.hot.dispose(() => {
				unsubscribe();
			});
		}
	}

	private async initializeSync() {
		try {
			const Corbado = await loadCorbado();
			if (Corbado.user) {
				// Enable sync when user is logged in
				await this.rep.pull(); // Initial pull
				this.rep.pushDelay = 1000;
				this.rep.pullInterval = 5 * 60 * 1000;
			} else {
				// Disable sync when logged out
				this.rep.pushDelay = Infinity;
				this.rep.pullInterval = Infinity;
			}
		} catch (error) {
			console.error('Failed to initialize sync:', error);
		}
	}

	async has(id: StorageId): Promise<boolean> {
		if (!isStorageId(id)) return false;
		const item = await this.rep.query(async (tx) => {
			return await tx.get(`${SPACE_FILES}/${id}`);
		});
		return item !== null;
	}

	async read(id: StorageId): Promise<FileItem | null> {
		if (!isStorageId(id)) return null;
		const item = await this.rep.query(async (tx) => {
			return await tx.get(`${SPACE_FILES}/${id}`);
		});
		return item as FileItem | null;
	}

	async write(item: FileItem): Promise<void> {
		if (!isStorageId(item.id)) return;
		await this.rep.mutate.createFile(item);
	}

	async delete(id: StorageId): Promise<void> {
		if (!isStorageId(id)) return;
		await this.rep.mutate.deleteFile(id);
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
		await this.rep.mutate.addStar(id);
	}

	async removeStar(id: StorageId): Promise<void> {
		if (!isStorageId(id)) return;
		if (!starredIds.includes(id)) return;
		await this.rep.mutate.deleteStar(id);
	}

	async scan(sortBy: keyof FileItem = 'accessTime'): Promise<Map<StorageId, FileItem>> {
		const items = await this.rep.query(async (tx) => {
			const items = new Map<StorageId, FileItem>();
			const starred = new Set(starredIds);

			// First get starred items
			for (const id of starred) {
				if (isStorageId(id)) {
					const item = await tx.get(`${SPACE_FILES}/${id}`);
					if (item) items.set(id, item as FileItem);
				}
			}

			// Then get all other items
			const allItems = await tx.scan({ prefix: SPACE_FILES }).entries().toArray();
			for (const [key, item] of allItems) {
				const id = key.split('/')[1] as StorageId;
				if (!starred.has(id)) {
					items.set(id, item as FileItem);
				}
			}

			return items;
		});

		// Sort items by the specified field
		const sortedEntries = Array.from(items.entries()).sort(([, a], [, b]) => {
			const aVal = a[sortBy];
			const bVal = b[sortBy];
			return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
		});

		return new Map(sortedEntries);
	}

	private subscribeToStars(callback: (stars: StorageId[]) => void) {
		return this.rep.subscribe(
			async (tx) => {
				const stars = await tx.scan({ prefix: SPACE_STARS }).entries().toArray();
				return stars.map(([key]) => key.split('/')[1] as StorageId);
			},
			{
				onData: callback
			}
		);
	}

	subscribe(callback: (items: Map<StorageId, FileItem>) => void) {
		// Subscribe to changes in the files space
		return this.rep.subscribe(
			// Body function that computes the value
			async (tx) => {
				const items = new Map<StorageId, FileItem>();
				const starred = new Set(starredIds);

				// First get starred items
				for (const id of starred) {
					if (isStorageId(id)) {
						const item = await tx.get(`${SPACE_FILES}/${id}`);
						if (item) items.set(id, item as FileItem);
					}
				}

				// Then get all other items
				const allItems = await tx.scan({ prefix: SPACE_FILES }).entries().toArray();
				for (const [key, item] of allItems) {
					const id = key.split('/')[1] as StorageId;
					if (!starred.has(id)) {
						items.set(id, item as FileItem);
					}
				}

				return items;
			},
			// Options with callback
			{
				onData: callback
			}
		);
	}
}

export const filesDb = new FilesDb();

// Run the janitor once after page load to clean up unstarred items
setTimeout(async () => {
	const MAX_UNSTARRED_ITEMS = 100;
	const items = await filesDb.scan();
	const unstarredItems = Array.from(items.entries()).filter(([id]) => !starredIds.includes(id));

	// If we have more unstarred items than our limit, delete the oldest ones
	if (unstarredItems.length > MAX_UNSTARRED_ITEMS) {
		// Sort by access time is already done by scan()
		// Delete all items after the first MAX_UNSTARRED_ITEMS
		for (const [id] of unstarredItems.slice(MAX_UNSTARRED_ITEMS)) {
			await filesDb.delete(id);
		}
	}
}, 1000);

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
	if (!item) {
		throw new Error('No item found');
	}
	return dataToMixture(item.mixture.data);
}
