/* eslint-disable @typescript-eslint/no-empty-function */
import { browser } from '$app/environment';

// Create a function that returns the appropriate storage object
const deviceStorage = browser
	? window.localStorage
	: {
			getItem: () => null,
			setItem: () => {},
			removeItem: () => {}
		};

/**
 * Generates a LocalStorageId from a mixture name.
 */
export function generateLocalStorageId(): LocalStorageId {
	return `/${Math.random().toString(36).slice(2, 12)}`;
}

export function isLocalStorageId(value: unknown): value is LocalStorageId {
	return typeof value === 'string' && /^\/.+/.test(value);
}

export function assertLocalStorageId(value: string | null): asserts value is LocalStorageId {
	if (!isLocalStorageId(value)) throw new Error(`Invalid LocalStorageId: ${value}`);
}

export function asLocalStorageId(value: string | null): LocalStorageId {
	assertLocalStorageId(value);
	return value;
}

/**
 * Creates a URL object from a LocalStorageId.
 */
export function makeUrl(id: LocalStorageId): URL {
	const item = deviceStorage.getItem(id);
	// need a protocol to create a valid URL object
	return new URL(`localstorage:${item}`);
}

/**
 * Extracts the name of a mixture from a LocalStorageId.
 */
export function getName(id: LocalStorageId): string {
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

export type LocalStorageId = `/${string}`;

export type FileItem = {
	id: LocalStorageId;
	accessTime: number;
	name: string;
	desc: string;
	href: string;
};

class FilesDb {
	has(id: LocalStorageId): boolean {
		if (!browser) return false;
		return deviceStorage.getItem(id) !== null;
	}

	idForItem(item: Pick<FileItem, 'name' | 'href'>): LocalStorageId | null {
		for (const file of this) {
			if (item.name === file.name && item.href === file.href) {
				return file.id;
			}
		}
		return null;
	}

	read(id: LocalStorageId): FileItem | null {
		if (!browser) return null;
		const item = deviceStorage.getItem(id);
		return item ? { ...JSON.parse(item), id } : null;
	}

	access(id: LocalStorageId): FileItem | null {
		if (!browser) return null;
		const item = this.read(id);
		if (item) {
			item.accessTime = Date.now();
			this.write(item);
			return item;
		}
		return null;
	}

	private *fileKeys(): IterableIterator<LocalStorageId> {
		for (const key in deviceStorage) {
			if (isLocalStorageId(key)) yield key;
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

	scan(sortBy: keyof FileItem = 'accessTime'): Map<LocalStorageId, FileItem> {
		const records: [LocalStorageId, FileItem][] = [];
		for (const id of this.fileKeys()) {
			const item = this.read(id);
			if (item) records.push([id, item]);
		}
		if (sortBy === 'accessTime') {
			records.sort((a, b) => a[1][sortBy] - b[1][sortBy]);
		} else if (sortBy) {
			records.sort((a, b) => a[1][sortBy].localeCompare(b[1][sortBy]));
		}
		return new Map(records);
	}

	write(item: FileItem): void {
		if (!browser) return;
		const { id, ...data } = item;
		if (!isLocalStorageId(id)) throw new Error('Invalid LocalStorageId');
		if (!data.name) throw new Error('Invalid name');
		if (!data.href) throw new Error('Invalid href');

		deviceStorage.setItem(id, JSON.stringify(data));
	}

	delete(id: LocalStorageId): void {
		if (!browser) return;
		deviceStorage.removeItem(id);
	}

	update(id: LocalStorageId, updater: (item: Omit<FileItem, 'id'>) => Omit<FileItem, 'id'>): void {
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
