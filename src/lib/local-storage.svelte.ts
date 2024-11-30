/* eslint-disable @typescript-eslint/no-empty-function */
import { browser } from '$app/environment';
import { deleteStar } from './stars.svelte.js';
import { isStorageId, type StorageId } from './storage-id.js';

// Create a function that returns the appropriate storage object
const deviceStorage = browser
	? window.localStorage
	: {
			getItem: () => null,
			setItem: () => {},
			removeItem: () => {}
		};

/**
 * Creates a URL object from a LocalStorageId.
 */
export function makeUrl(id: StorageId): URL {
	const item = deviceStorage.getItem(id);
	// need a protocol to create a valid URL object
	return new URL(`localstorage:${item}`);
}

/**
 * Extracts the name of a mixture from a LocalStorageId.
 */
export function getName(id: StorageId): string {
	const url = makeUrl(id);
	return decodeURIComponent(url.pathname).split('/').pop() || '';
}

/**
 * Resolves a relative path against the current window location
 * without actually navigating to it.
 * @param relativePath - The relative path to resolve
 * @returns {string} The fully resolved absolute URL
 */
export function resolveUrl(relativePath: string): string {
	// Create an anchor element
	const link = document.createElement('a');

	// Setting href on an anchor element will automatically resolve the URL
	// relative to the current page location
	link.href = relativePath;

	// The resolved URL is available in the href property
	// This gives us the fully qualified URL
	return link.href;
}

export type FileItem = {
	id: StorageId;
	accessTime: number;
	name: string;
	desc: string;
	href: string;
};

class FilesDb {
	has(id: StorageId): boolean {
		if (!browser) return false;
		return deviceStorage.getItem(id) !== null;
	}

	idForItem(item: Pick<FileItem, 'name' | 'href'>): StorageId | null {
		for (const file of this) {
			if (item.name === file.name && item.href === file.href) {
				return file.id;
			}
		}
		return null;
	}

	read(id: StorageId): FileItem | null {
		if (!browser) return null;
		const item = deviceStorage.getItem(id);
		return item ? { ...JSON.parse(item), id } : null;
	}

	access(id: StorageId): FileItem | null {
		if (!browser) return null;
		const item = this.read(id);
		if (item) {
			item.accessTime = Date.now();
			this.write(item);
			return item;
		}
		return null;
	}

	private *fileKeys(): IterableIterator<StorageId> {
		for (const key in deviceStorage) {
			if (isStorageId(key)) yield key;
		}
	}

	get length(): number {
		if (!browser) return 0;
		return [...this.fileKeys()].length;
	}

	*[Symbol.iterator](): IterableIterator<FileItem> {
		if (!browser) return;
		for (const id of this.fileKeys()) {
			const item = this.read(id);
			if (item) yield item;
		}
	}

	scan(sortBy: keyof FileItem = 'accessTime'): Map<StorageId, FileItem> {
		const records: [StorageId, FileItem][] = [];
		for (const item of this) {
			if (item) records.push([item.id, item]);
		}
		if (sortBy === 'accessTime') {
			records.sort((a, z) => z[1][sortBy] - a[1][sortBy]);
		} else if (sortBy) {
			records.sort((a, b) => a[1][sortBy].localeCompare(b[1][sortBy]));
		}
		return new Map(records);
	}

	write(item: FileItem): void {
		if (!browser) return;
		const { id, ...data } = item;
		if (!isStorageId(id)) throw new Error('Invalid LocalStorageId');
		if (!data.name) throw new Error('Invalid name');
		if (!data.href) throw new Error('Invalid href');

		deviceStorage.setItem(id, JSON.stringify(data));
	}

	delete(id: StorageId): void {
		if (!browser) return;
		deviceStorage.removeItem(id);
		deleteStar(id);
	}

	update(id: StorageId, updater: (item: Omit<FileItem, 'id'>) => Omit<FileItem, 'id'>): void {
		if (!browser) return;
		const item = this.access(id) ?? { id, accessTime: 0, name: '', desc: '', href: '' };
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { id: _id, ...data } = item;
		this.write({ ...updater(data), id });
	}
}

export const filesDb = new FilesDb();

export function listFiles<T extends Record<string, unknown> = Record<string, never>>(
	extra: T = {} as T
): Array<FileItem & T> {
	const files = filesDb.scan();
	const out: Array<FileItem & T> = [];
	for (const [id, item] of files) {
		out.push({ ...item, id, ...extra });
	}
	return out;
}
