import { isStorageId, type StorageId } from './storage-id.js';
import {
	currentDataVersion,
	fileSchemaV1,
	fileSyncSchema,
	type DeserializedFileDataV1,
	type SerializedFileDataV1,
} from '$lib/data-format.js';
import { Mixture } from './mixture.js';
import { browser } from '$app/environment';
import type { TablesSchema } from 'tinybase';
import { createStore, type Store } from 'tinybase/with-schemas';
import {
	createLocalPersister,
	type LocalPersister,
} from 'tinybase/persisters/persister-browser/with-schemas';
import { cloudStoredIds } from './starred-ids.svelte.js';

const tableSchema = {
	files: fileSchemaV1,
	sync: fileSyncSchema,
} as const satisfies TablesSchema;

const valueSchema = {
	currentDataVersion: { type: 'number', default: currentDataVersion },
} as const;

export class FilesDb {
	private store: Store<[typeof tableSchema, typeof valueSchema]> | null = browser
		? createStore().setSchema(tableSchema, valueSchema)
		: null;
	private localPersister: LocalPersister<[typeof tableSchema, typeof valueSchema]> | null = null;

	constructor() {
		if (browser && this.store) {
			this.localPersister = createLocalPersister(this.store, 'files-db');
		}
	}

	async init(): Promise<void> {
		if (!browser || !this.store || !this.localPersister) return;
		if (this.localPersister.isAutoLoading() && this.localPersister.isAutoSaving()) {
			// Already initialized
			return;
		}
		await this.localPersister.startAutoPersisting();
		await this.localPersister.load();
		const files = this.store.getRowIds('files');
		console.log('FilesDb: loaded', files.length, 'files');
	}

	async toggleStar(id: StorageId): Promise<boolean> {
		if (!browser || !this.store) return false;
		const starredResp = await fetch(`../api/mixtures/${id}/star`);
		if (starredResp.ok) {
			await this.delMixtureFromCloud(id);
			return false; // Unstarred successfully
		} else if (starredResp.status === 404) {
			await this.saveMixtureToCloud(id);
			return true; // Starred successfully
		} else {
			throw new Error(
				'FilesDb: Failed to toggle star for id ' + id + ': ' + starredResp.statusText,
			);
		}
	}

	async saveMixtureToCloud(id: StorageId): Promise<void> {
		if (!browser || !this.store) return;
		const file = this.store.getRow('files', id);
		if (!file) {
			console.warn('FilesDb: no row found for id', id);
			return;
		}
		const data = await this.read(id);
		if (!data) {
			console.warn('FilesDb: no data found for id', id);
			return;
		}
		const serialized = this.serialize(data);
		await this.putMx(serialized);
	}

	async delMixtureFromCloud(id: StorageId): Promise<void> {
		if (!browser || !this.store) return;
		const response = await fetch(`../api/mixtures/${id}`, {
			method: 'DELETE',
		});
		if (!response.ok) {
			console.error('Failed to delete mixture from cloud:', response.statusText);
			return;
		}

		this.store.delRow('sync', id);
		console.log('FilesDb: deleted mixture from cloud and local store for id', id);
		cloudStoredIds.delete(id);
	}

	private async putMx(data: SerializedFileDataV1): Promise<void> {
		if (!browser || !this.store) return;
		const sync = await this.store.getRow('sync', data.id);
		const response = await fetch(`../api/mixtures/${data.id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'X-Last-Sync-Time': sync?.lastSyncTime?.toString() || '0',
			},
			body: JSON.stringify(data),
		});
		// handle precondition failed
		if (response.status === 412 && confirm(await response.text())) {
			// User confirmed to overwrite
			console.log('User confirmed to overwrite the mixture');
			// update the lastSyncTime to now
			this.store.setRow('sync', data.id, {
				lastSyncTime: Date.now(),
				lastSyncHash: data._ingredientHash,
			});
			// Retry the PUT request
			return this.putMx(data);
		}
		if (!response.ok) {
			console.error('Failed to save mixture to cloud:', response.statusText);
		}
		const responseData = await response.json();
		if (responseData.ok) {
			if (!responseData.lastSyncTime || !responseData.lastSyncHash) {
				throw new Error('PUT Response missing lastSyncTime or lastSyncHash');
			}
			// If the response contains a lastSyncTime, update the local store
			this.store.setRow('sync', data.id, {
				lastSyncTime: responseData.lastSyncTime,
				lastSyncHash: responseData.lastSyncHash,
			});
		} else {
			console.error('Failed to save mixture to cloud:', responseData);
		}
		cloudStoredIds.set(data.id, {
			ingredientHash: data._ingredientHash,
		});
	}

	private async getMx(id: StorageId): Promise<DeserializedFileDataV1 | null> {
		if (!browser || !this.store) return null;
		const response = await fetch(`../api/mixtures/${id}`);
		if (!response.ok) {
			if (response.status === 404) {
				console.warn('FilesDb: No mixture found for id', id);
				return null; // Not found
			}
			console.error('FilesDb: Failed to fetch mixture from cloud:', response.statusText);
			return null; // Other error
		}
		const data = (await response.json()) as SerializedFileDataV1;
		if (!data) {
			console.warn('FilesDb: No data found for id', id);
			return null; // No data
		}
		return this.deserialize(data);
	}

	close(): void {
		if (this.localPersister) {
			this.localPersister.stopAutoPersisting();
			this.localPersister.destroy?.();
			this.localPersister = null;
		}
	}
	async runJanitor(stars: Set<string>): Promise<void> {
		const MAX = 100;
		if (!this.store) return;
		try {
			const ids = this.store.getRowIds('files');
			for (const id of ids.filter((i) => !stars.has(i)).slice(MAX)) {
				await this.delete(id);
			}
		} catch (e) {
			console.error('FilesDb janitor error', e);
		}
	}
	async hasId(id: StorageId): Promise<boolean> {
		if (!isStorageId(id) || !this.store) return false;
		return this.store.getRow('files', id) !== undefined;
	}

	async hasEquivalentItem(ingredientHash: string): Promise<boolean> {
		if (!this.store) return false;
		for (const e of this.scanFiles()) {
			if (e._ingredientHash === ingredientHash) return true;
		}
		return false;
	}
	/**
	 * Read a stored file by ID from the TinyBase table.
	 */
	async read(id: StorageId): Promise<DeserializedFileDataV1 | null> {
		if (!isStorageId(id) || !this.store) return null;
		await this.init();
		const row = this.store.getRow('files', id);
		if (!row) {
			console.warn(`FilesDb: No row found for id ${id}`);
			return null; // Not found
		}
		try {
			return this.deserialize(row as SerializedFileDataV1);
		} catch (e) {
			console.warn(`FilesDb: failed to parse JSON for id ${id}`, e);
			return null;
		}
	}
	/**
	 * Write (upsert) a file record into the TinyBase table.
	 */
	async write(item: { id: string; name: string; mixture: Mixture }): Promise<void> {
		if (!isStorageId(item.id) || !this.store) return;
		this.store.setRow(
			'files',
			item.id,
			this.serialize({
				version: currentDataVersion,
				id: item.id,
				name: item.name,
				accessTime: Date.now(),
				desc: item.mixture.describe(),
				rootMixtureId: item.mixture.id,
				ingredientDb: item.mixture.serialize(),
				_ingredientHash: item.mixture.getIngredientHash(item.name),
			}),
		);
	}

	private serialize(item: DeserializedFileDataV1): SerializedFileDataV1 {
		if (!isStorageId(item.id)) {
			throw new Error('Invalid item provided for serialization');
		}
		const { ingredientDb, ...rest } = item;
		return {
			...rest,
			ingredientJSON: JSON.stringify(ingredientDb),
		};
	}

	private deserialize(item: SerializedFileDataV1): DeserializedFileDataV1 {
		const { ingredientJSON, ...rest } = item;
		return {
			...rest,
			ingredientDb: JSON.parse(ingredientJSON),
		};
	}

	async delete(id: StorageId): Promise<void> {
		if (!isStorageId(id) || !this.store) return;
		this.store.delRow('files', id);
	}
	/**
	 * Retrieve all stored files, ordering by sortBy descending.
	 */
	private *scanFiles(sortBy: keyof SerializedFileDataV1 = 'accessTime', descending = true) {
		if (!this.store) return;
		// Gather all file IDs
		const ids = this.store.getSortedRowIds('files', sortBy, descending);
		for (const id of ids) {
			const row = this.store.getRow('files', id);
			if (row) yield this.deserialize(row as SerializedFileDataV1);
		}
	}

	subscribeToFiles(cb: (i: DeserializedFileDataV1, idx: number) => void): (() => void) | null {
		if (!browser || !this.store) return null;
		const emit = () => {
			let idx = 0;
			for (const file of this.scanFiles()) cb(file, idx++);
		};
		emit();
		const fL = this.store.addTableListener('files', emit);
		this.store.addRowListener;
		return () => {
			this.store!.delListener(fL);
		};
	}

	async deserializeFromStorage(id: string): Promise<Mixture> {
		if (!isStorageId(id)) throw new Error('Invalid id');
		await this.init();
		const f = await this.read(id);
		if (f) return Mixture.deserialize(f.rootMixtureId, f.ingredientDb);

		if (browser) {
			// If we didn't find it in the local store, try to fetch it from the cloud
			console.warn('FilesDb: Mixture not found in local store, fetching from cloud');
			const mx = await this.getMx(id);
			if (!mx) {
				throw new Error(`FilesDb: No row found for id ${id}`);
			}
			const mixture = Mixture.deserialize(mx.rootMixtureId, mx.ingredientDb);
			// If we found the mixture in the cloud, write it to the local store
			await this.write({
				id: mx.id,
				name: mx.name,
				mixture,
			});
			return mixture;
		}

		throw new Error(`No mixture found for id ${id}`);
	}
}
export const filesDb = new FilesDb();

export async function getName(id: StorageId): Promise<string> {
	const f = await filesDb.read(id);
	return f?.name || '';
}
