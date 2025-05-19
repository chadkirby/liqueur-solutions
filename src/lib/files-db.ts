import { isStorageId, type StorageId } from './storage-id.js';
import { currentDataVersion, getIngredientHash, type StoredFileDataV1 } from '$lib/data-format.js';
import { Mixture } from './mixture.js';
import { browser } from '$app/environment';
import { starredIds } from './starred-ids.svelte.js';
import type { TablesSchema } from 'tinybase';
import { createMergeableStore, type MergeableStore } from 'tinybase/with-schemas';
import {
	createLocalPersister,
	type LocalPersister,
} from 'tinybase/persisters/persister-browser/with-schemas';
import {
	createRemotePersister,
	type RemotePersister,
} from 'tinybase/persisters/persister-remote/with-schemas';

type TinyTableRow = Omit<StoredFileDataV1, 'ingredientDb'> & {
	ingredientDb: string; // serialized Map<string, IngredientData>
	ingredientHash: string; // hash of the file contents
};

const tableSchema: TablesSchema = {
	files: {
		version: { type: 'number' },
		id: { type: 'string' },
		name: { type: 'string' },
		accessTime: { type: 'number' },
		desc: { type: 'string' },
		rootMixtureId: { type: 'string' },
		ingredientDb: { type: 'string' }, // serialized Map<string, IngredientData>
		ingredientHash: { type: 'string' }, // hash of the file contents
	},
	stars: {
		id: { type: 'string' },
	},
} as const;

const valueSchema = {
	currentDataVersion: { type: 'number', default: currentDataVersion },
} as const;

export class FilesDb {
	private store: MergeableStore<[typeof tableSchema, typeof valueSchema]> | null = browser
		? createMergeableStore().setSchema(tableSchema, valueSchema)
		: null;
	private remotePersister: RemotePersister<[typeof tableSchema, typeof valueSchema]> | null = null;
	private localPersister: LocalPersister<[typeof tableSchema, typeof valueSchema]> | null = null;
	private starsListenerId: string | null = null;

	constructor() {
		if (browser && this.store) {
			this.localPersister = createLocalPersister(this.store, 'files-db');
			this.starsListenerId = this.store.addRowIdsListener('stars', (store) => {
				const ids = store.getRowIds('stars');
				starredIds.length = 0;
				starredIds.push(...ids);
			});
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
		const initialStars = this.store.getRowIds('stars');
		starredIds.length = 0;
		starredIds.push(...initialStars);
	}
	/**
	 * Begin syncing to remote R2 store. Call after user auth is ready.
	 */
	async startSync(): Promise<void> {
		if (!browser || !this.store) return;
		this.remotePersister ??= createRemotePersister(
			this.store,
			'/api/tinybase/load',
			'/api/tinybase/save',
			300,
			(e) => console.error('TinyBase sync error', e),
		);

		// Begin auto-persist and auto-load loops
		await this.remotePersister.startAutoPersisting();
	}

	/**
	 * Stop syncing to remote store (leave local store intact).
	 */
	async stopSync(): Promise<void> {
		if (this.remotePersister) {
			await this.remotePersister.stopAutoPersisting();
		}
	}
	close(): void {
		if (this.localPersister) {
			this.localPersister.stopAutoPersisting();
			this.localPersister.destroy?.();
			this.localPersister = null;
		}
		if (this.remotePersister) {
			this.remotePersister.stopAutoPersisting();
			this.remotePersister.destroy?.();
			this.remotePersister = null;
		}
		if (this.store) {
			if (this.starsListenerId) this.store.delListener(this.starsListenerId);
		}
	}
	async runJanitor(): Promise<void> {
		const MAX = 100;
		if (!this.store) return;
		try {
			const ids = this.store.getRowIds('files');
			const stars = new Set(this.store.getRowIds('stars'));
			for (const id of ids.filter((i) => !stars.has(i)).slice(MAX)) {
				this.delete(id);
			}
		} catch (e) {
			console.error('FilesDb janitor error', e);
		}
	}
	async hasId(id: StorageId): Promise<boolean> {
		if (!isStorageId(id) || !this.store) return false;
		return this.store.getRow('files', id) !== undefined;
	}

	async hasEquivalentItem(item: StoredFileDataV1): Promise<boolean> {
		if (!isStorageId(item.id) || !this.store) return false;
		const target = getIngredientHash(item);
		for (const e of this.scan().values()) {
			if (e.ingredientHash === target) return true;
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
			return this.tinyRowToData(row as TinyTableRow);
		} catch (e) {
			console.warn(`FilesDb: failed to parse JSON for id ${id}`, e);
			return null;
		}
	}
	/**
	 * Write (upsert) a file record into the TinyBase table.
	 */
	async write(item: StoredFileDataV1): Promise<void> {
		if (!isStorageId(item.id) || !this.store) return;
		this.store.setRow('files', item.id, this.dataToTinyRow(item));
	}

	private dataToTinyRow(item: StoredFileDataV1): TinyTableRow {
		const ingredientDb = JSON.stringify(item.ingredientDb);
		return {
			...item,
			ingredientDb,
			ingredientHash: getIngredientHash(item),
		};
	}

	private tinyRowToData(item: TinyTableRow): StoredFileDataV1 & { ingredientHash: string } {
		return {
			...item,
			ingredientDb: JSON.parse(item.ingredientDb),
		};
	}

	async writeIfNoEquivalentExists(item: StoredFileDataV1, starred = false): Promise<void> {
		if (!isStorageId(item.id) || !this.store) return;
		if (!(await this.hasEquivalentItem(item))) {
			await this.write(item);
			if (starred) await this.addStar(item.id);
		}
	}
	async delete(id: StorageId): Promise<void> {
		if (!isStorageId(id) || !this.store) return;
		this.store.delRow('files', id);
		this.store.delRow('stars', id);
	}
	async toggleStar(id: StorageId): Promise<void> {
		if (!isStorageId(id) || !this.store) return;
		const s = this.store.getRowIds('stars');
		if (s.includes(id)) await this.removeStar(id);
		else await this.addStar(id);
	}
	async addStar(id: StorageId): Promise<void> {
		if (!isStorageId(id) || !this.store) return;
		const s = this.store.getRowIds('stars');
		if (!s.includes(id)) this.store.setRow('stars', id, {});
	}
	async removeStar(id: StorageId): Promise<void> {
		if (!isStorageId(id) || !this.store) return;
		const s = this.store.getRowIds('stars');
		if (s.includes(id)) this.store.delRow('stars', id);
	}
	/**
	 * Retrieve all stored files, ordering starred first, then by sortBy descending.
	 */
	private scan(sortBy: keyof StoredFileDataV1 = 'accessTime') {
		const m = new Map<StorageId, ReturnType<FilesDb['tinyRowToData']>>();
		if (!this.store) return m;
		// Gather all file IDs
		const ids = this.store.getRowIds('files');
		const stars = new Set(this.store.getRowIds('stars'));
		for (const id of ids) {
			const row = this.store.getRow('files', id);
			if (!row) continue;
			try {
				m.set(id, this.tinyRowToData(row as TinyTableRow));
			} catch (e) {
				console.warn(`FilesDb: failed to parse JSON for id ${id}`, e); // Log the error for better debugging
			}
		}
		// Sort: starred first, then by sortBy descending
		const arr = [...m.values()].sort((a, b) => {
			const aStar = stars.has(a.id) ? 0 : 1;
			const bStar = stars.has(b.id) ? 0 : 1;
			if (aStar !== bStar) return aStar - bStar;
			return a[sortBy] < b[sortBy] ? 1 : a[sortBy] > b[sortBy] ? -1 : 0;
		});
		return new Map(arr.map((i) => [i.id, i]));
	}

	subscribe(cb: (i: StoredFileDataV1, idx: number) => void): (() => void) | null {
		if (!browser || !this.store) return null;
		const emit = () => {
			let idx = 0;
			for (const i of this.scan().values()) cb(i, idx++);
		};
		emit();
		const fL = this.store.addTableListener('files', emit);
		const sL = this.store.addTableListener('stars', emit);
		return () => {
			this.store!.delListener(fL);
			this.store!.delListener(sL);
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
