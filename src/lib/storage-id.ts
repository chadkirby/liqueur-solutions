export type StorageId = `/${string}`;

/**
 * Generates a LocalStorageId from a mixture name.
 */
export function generateStorageId(): StorageId {
	return `/${Math.random().toString(36).slice(2, 12)}`;
}

export function isStorageId(value: unknown): value is StorageId {
	return typeof value === 'string' && /^[/].+/.test(value);
}

export function assertStorageId(value: string | null): asserts value is StorageId {
	if (!isStorageId(value)) throw new Error(`Invalid LocalStorageId: ${value}`);
}

export function asStorageId(value: string | null): StorageId {
	assertStorageId(value);
	return value;
}
