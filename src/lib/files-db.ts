import { isStorageId, type StorageId } from './storage-id.js';
import {
	currentDataVersion,
	fileSchemaV1,
	fileSyncSchema,
	type DeserializedFileDataV1,
	type FileSyncMeta,
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
	/**
	 * Begin syncing to remote R2 store. Call after user auth is ready.
	 */
	async saveMixtureToCloud(data: DeserializedFileDataV1): Promise<void> {
		if (!browser || !this.store) return;
		const row = this.store.getRow('files', data.id);
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

	async hasEquivalentItem(item: DeserializedFileDataV1): Promise<boolean> {
		if (!isStorageId(item.id) || !this.store) return false;
		for (const e of this.scan().values()) {
			if (e._ingredientHash === item._ingredientHash) return true;
		}
		return false;
	}
	/**
	 * Read a stored file by ID from the TinyBase table.
	 */
	async read(id: StorageId) {
		if (!isStorageId(id) || !this.store) return null;
		await this.init();
		const row = this.store.getRow('files', id);
		if (!row) return null;
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
	async write(item: DeserializedFileDataV1, syncMeta?: FileSyncMeta): Promise<void> {
		if (!isStorageId(item.id) || !this.store) return;
		this.store.setRow('files', item.id, this.serialize(item));
		if (syncMeta) {
			this.store.setRow('sync', item.id, syncMeta);
		}
	}

	private serialize(item: DeserializedFileDataV1): SerializedFileDataV1 {
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
	private scan(sortBy: keyof SerializedFileDataV1 = 'accessTime', descending = true) {
		const files = new Map<StorageId, DeserializedFileDataV1>();
		if (!this.store) return files;
		// Gather all file IDs
		const ids = this.store.getSortedRowIds('files', sortBy, descending);
		for (const id of ids) {
			const row = this.store.getRow('files', id);
			if (!row) continue;
			try {
				files.set(id, this.deserialize(row as SerializedFileDataV1));
			} catch (e) {
				console.warn(`FilesDb: failed to parse JSON for id ${id}`, e); // Log the error for better debugging
			}
		}
		return files;
	}

	subscribe(cb: (i: DeserializedFileDataV1, idx: number) => void): (() => void) | null {
		if (!browser || !this.store) return null;
		const emit = () => {
			let idx = 0;
			for (const i of this.scan().values()) cb(i, idx++);
		};
		emit();
		const fL = this.store.addTableListener('files', emit);
		return () => {
			this.store!.delListener(fL);
		};
	}
}
export const filesDb = new FilesDb();

export async function getName(id: StorageId): Promise<string> {
	const f = await filesDb.read(id);
	return f?.name || '';
}

export async function deserializeFromStorage(id: string): Promise<Mixture> {
	if (!isStorageId(id)) throw new Error('Invalid id');
	await filesDb.init();
	const f = await filesDb.read(id);
	if (!f) throw new Error('No item found');
	return Mixture.deserialize(f.rootMixtureId, f.ingredientDb);
}
