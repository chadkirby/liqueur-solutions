import { customAlphabet, urlAlphabet } from 'nanoid';

export type StorageId = string;

const idLength = 16; // Length of the generated ID

const nanoid = customAlphabet(urlAlphabet, idLength);

/**
 * Generates a new LocalStorageId.
 */
export function generateStorageId(): StorageId {
	return nanoid();
}

const alphabetSet = new RegExp(`^[-${urlAlphabet.replace('-', '')}]+$`);

export function isStorageId(value: unknown): value is StorageId {
	return typeof value === 'string' && alphabetSet.test(value);
}

export function assertStorageId(value: unknown): asserts value is StorageId {
	if (!isStorageId(value)) throw new Error(`Not a valid StorageId: ${value}`);
}

export function toStorageId(value: unknown): StorageId {
	assertStorageId(value);
	return value;
}
