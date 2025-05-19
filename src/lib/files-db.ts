import { isStorageId, type StorageId } from './storage-id.js';
import { type StoredFileDataV1 } from '$lib/data-format.js';
import { Mixture } from './mixture.js';
import { browser } from '$app/environment';
import { starredIds } from './starred-ids.svelte.js';
import { SimpleHash } from './simple-hash.js';
import { isMixtureData } from './mixture-types.js';
import { isSubstanceIid } from './ingredients/substances.js';
import { createStore } from 'tinybase';
import { createRemotePersister } from 'tinybase/persisters/persister-remote';

export class FilesDb {
	private store = browser ? createStore().setTables({ files: {}, stars: {} }) : null;
	private persister: any = null;
	private localSaveListener: string | null = null;
	constructor() {
		if (browser && this.store) {
			const saved = localStorage.getItem('files-db');
			if (saved) {
				try {
					const tables = JSON.parse(saved);
					this.store.setTables(tables);
				} catch {
					console.warn('FilesDb: Failed to parse saved data');
				}
			}
			this.localSaveListener = this.store.addTablesListener((store) => {
				localStorage.setItem('files-db', JSON.stringify(store.getTables()));
			});
			const initialStars = this.store.getRowIds('stars');
			starredIds.length = 0;
			starredIds.push(...initialStars);
			this.store.addRowIdsListener('stars', (store) => {
				const ids = store.getRowIds('stars');
				starredIds.length = 0;
				starredIds.push(...ids);
			});
		}
	}
	/**
	 * Begin syncing to remote R2 store. Call after user auth is ready.
	 */
	startSync(): void {
		if (!browser || !this.store) return;
		if (!this.persister) {
			this.persister = createRemotePersister(
				this.store,
				'/api/tinybase/load',
				'/api/tinybase/save',
				300,
				(e) => console.error('TinyBase sync error', e),
			);
		}
		// Begin auto-persist and auto-load loops
		this.persister.startAutoPersisting();
		this.persister.startAutoLoad();
		// Immediately save current local store to remote
		this.persister.save().catch((e: any) =>
			console.error('TinyBase initial save error', e)
		);
	}

	/**
	 * Stop syncing to remote store (leave local store intact).
	 */
	stopSync(): void {
		if (this.persister) {
			this.persister.stopAutoLoad();
			this.persister.stopAutoPersisting();
		}
	}
	close(): void {
		if (browser && this.store) {
			if (this.localSaveListener !== null) {
				this.store.delListener(this.localSaveListener);
				this.localSaveListener = null;
			}
			if (this.persister) {
				this.persister.destroy?.();
				this.persister = null;
			}
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
	async migrateV0ToV1(): Promise<void> {}
	getItemHash(item: StoredFileDataV1): string {
		const h = new SimpleHash().update(item.name).update(item.desc);
		for (const [_, ing] of item.ingredientDb) {
			if (isMixtureData(ing)) {
				for (const { id, name, mass, notes } of ing.ingredients) {
					h.update(name)
						.update(mass.toString())
						.update(notes || '');
					if (isSubstanceIid(id)) h.update(id);
				}
			} else {
				h.update(ing.id);
			}
		}
		return h.toString();
	}
	async hasId(id: StorageId): Promise<boolean> {
		if (!isStorageId(id) || !this.store) return false;
		return this.store.getRow('files', id) !== undefined;
	}
	async hasEquivalentItem(item: StoredFileDataV1): Promise<boolean> {
		if (!isStorageId(item.id) || !this.store) return false;
		const target = this.getItemHash(item);
		for (const e of this.scan().values()) {
			if (this.getItemHash(e) === target) return true;
		}
		return false;
	}
  /**
   * Read a stored file by ID from the TinyBase table.
   */
  async read(id: StorageId): Promise<StoredFileDataV1 | null> {
    if (!isStorageId(id) || !this.store) return null;
    const row = this.store.getRow('files', id) as { data?: string } | undefined;
    if (!row?.data) return null;
    try {
      return JSON.parse(row.data) as StoredFileDataV1;
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
    // JSON-serialize the entire record into one cell
    this.store.setRow('files', item.id, { data: JSON.stringify(item) });
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
  private scan(sortBy: keyof StoredFileDataV1 = 'accessTime'): Map<StorageId, StoredFileDataV1> {
    const m = new Map<StorageId, StoredFileDataV1>();
    if (!this.store) return m;
    // Gather all file IDs
    const ids = this.store.getRowIds('files');
    const stars = new Set(this.store.getRowIds('stars'));
    for (const id of ids) {
      const row = this.store.getRow('files', id) as { data?: string } | undefined;
      if (!row?.data) continue;
      try {
        const data = JSON.parse(row.data) as StoredFileDataV1;
        m.set(id, data);
      } catch {
        // skip invalid JSON
      }
    }
    // Sort: starred first, then by sortBy descending
    const arr = [...m.values()].sort((a, b) => {
      const aStar = stars.has(a.id) ? 0 : 1;
      const bStar = stars.has(b.id) ? 0 : 1;
      if (aStar !== bStar) return aStar - bStar;
      return a[sortBy] < b[sortBy] ? 1 : a[sortBy] > b[sortBy] ? -1 : 0;
    });
    return new Map(arr.map(i => [i.id, i]));
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
	const f = await filesDb.read(id);
	if (!f) throw new Error('No item found');
	return Mixture.deserialize(f.rootMixtureId, f.ingredientDb);
}
