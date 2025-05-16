import { customAlphabet, urlAlphabet } from 'nanoid';

export type StorageId = string;

const nanoid = customAlphabet(urlAlphabet, 16);

/**
 * Generates a new LocalStorageId.
 */
export function generateStorageId(): StorageId {
	return nanoid();
}

export function isStorageId(value: unknown): value is StorageId {
	return typeof value === 'string' && value.length > 0;
}

export function assertStorageId(value: unknown): asserts value is StorageId {
	if (!isStorageId(value)) throw new Error(`Not a valid StorageId: ${value}`);
}

export function toStorageId(value: unknown): StorageId {
	assertStorageId(value);
	return value;
}
