import { type StorageId, type StoredFileDataV1 } from './data-types.js'; // Updated import
import { partyKitSync as partyKitSyncStore } from './partykit-sync-store.svelte.js'; // Import PartyKitSync store
import { get, type Unsubscriber } from 'svelte/store'; // To get store value once and for types
import { Mixture } from './mixture.js';
// import { isV0Data, isV1Data } from '$lib/data-format.js'; // No longer needed for v0/v1 checks here
// import { portV0DataToV1 } from './migrations/v0-v1.js'; // No longer needed
import { starredIds } from './starred-ids.svelte.js'; // Still used for janitor logic, but now derived

// No longer a class, but a collection of functions using PartyKitSync
// No Replicache specific code, no mutators, no SPACE_FILES/SPACE_STARS constants for Replicache

// Helper to get PartyKitSync instance
function getPks() {
	const pksInstance = get(partyKitSyncStore);
	if (!pksInstance) {
		// This case should ideally not happen if PartyKitSync is initialized correctly on app load
		// and UI is blocked or limited until it's ready.
		console.warn('PartyKitSync instance not available. Operations might fail.');
	}
	return pksInstance;
}

// startSync and stopSync are implicitly handled by PartyKitSync's connect/close logic
// and its own reconnection mechanisms. Clerk user changes in +layout.svelte manage this.
export function startSync() {
	// PartyKitSync connects automatically based on user session.
	// This function can be a no-op or log for compatibility.
	console.log('filesDb.startSync called (now managed by PartyKitSync lifecycle)');
}

export function stopSync() {
	// PartyKitSync closes automatically based on user session.
	// This function can be a no-op or log for compatibility.
	console.log('filesDb.stopSync called (now managed by PartyKitSync lifecycle)');
}

export function close() {
	// This might still be called from old code.
	// PartyKitSync instance is closed when user logs out or layout unmounts.
	// Explicitly calling pks.close() here might be redundant or interfere
	// if not handled carefully with the main lifecycle in +layout.svelte.
	console.log('filesDb.close called (PartyKitSync manages its own connection lifecycle)');
}

// Removed client-side runJanitor function. This logic will be moved to the server's onCron.

export async function has(id: StorageId): Promise<boolean> {
	const pks = getPks();
	if (!pks) return false;
	// Assuming PartyKitSync has a way to check for a file or read it
	// For now, using readFile and checking existence
	const file = pks.readFile(id); // readFile is synchronous in current PartyKitSync
	return !!file;
}

export async function read(id: StorageId): Promise<StoredFileDataV1 | null> {
	const pks = getPks();
	if (!pks) return null;
	const file = pks.readFile(id); // readFile is synchronous
	// Data should already be in StoredFileDataV1 format from PartyKitSync
	// No V0 to V1 conversion needed here as server and PartyKitSync handle V1
	return file || null;
}

export async function write(item: StoredFileDataV1): Promise<void> {
	const pks = getPks();
	if (!pks) return;
	// Make sure version is set, PartyKitSync expects it.
	// If your app logic doesn't set it, default it here or in PartyKitSync.
	// const currentDataVersion = 1; // Or import from data-types if defined there
	// item.version = item.version || currentDataVersion;
	pks.updateFile(item);
}

export async function deleteFile(id: StorageId): Promise<void> { // Renamed from delete to deleteFile for clarity
	const pks = getPks();
	if (!pks) return;
	pks.deleteFile(id);
}

export async function toggleStar(id: StorageId): Promise<void> {
	const pks = getPks();
	if (!pks) return;
	pks.toggleStar(id); // PartyKitSync has this helper
}

export async function addStar(id: StorageId): Promise<void> {
	const pks = getPks();
	if (!pks) return;
	pks.addStar(id);
}

export async function removeStar(id: StorageId): Promise<void> {
	const pks = getPks();
	if (!pks) return;
	pks.deleteStar(id);
}

export async function scan(
	sortBy: keyof StoredFileDataV1 = 'accessTime',
): Promise<Map<StorageId, StoredFileDataV1>> {
	const pks = getPks();
	if (!pks) return new Map();

	const filesArray = get(pks.getFiles()); // Get current files from the store

	// Sort items by the specified field
	const sortedArray = [...filesArray].sort((a, b) => {
		const aVal = a[sortBy];
		const bVal = b[sortBy];
		// Assuming descending order like original for accessTime
		return typeof aVal === 'number' && typeof bVal === 'number'
			? bVal - aVal
			: String(bVal).localeCompare(String(aVal));
	});

	const itemsMap = new Map<StorageId, StoredFileDataV1>();
	for (const item of sortedArray) {
		itemsMap.set(item.id, item);
	}
	return itemsMap;
}

/**
 * Subscribe to the full set of files; fires initially and on any add/update/delete.
 * This needs to adapt to Svelte store subscriptions.
 * The original callback style was `(item: StoredFileDataV1, i: number) => void`
 * Svelte stores typically provide the whole array.
 * We can try to emulate the old behavior or suggest components subscribe to partyKitSync.getFiles() directly.
 * For now, let's provide a way to subscribe to the array of files.
 */
export function subscribeToFiles(
	callback: (files: StoredFileDataV1[]) => void
): Unsubscriber | null {
	const pks = getPks();
	if (!pks) {
		callback([]);
		return null;
	}
	const filesStore = pks.getFiles();
	const unsubscribe = filesStore.subscribe(callback);
	return unsubscribe;
}

// The global filesDb instance is no longer needed as we export functions.
// export const filesDb = new FilesDb(); // Remove this line

/**
 * Extracts the name of a mixture from a StorageId.
 */
export async function getName(id: StorageId): Promise<string> {
	const item = await read(id); // Uses the new read function
	return item?.name || '';
}

/**
 * Deserializes a mixture from storage.
 */
export async function deserializeFromStorage(id: string): Promise<Mixture> {
	const item = await read(id); // Uses the new read function
	if (!item) {
		throw new Error(`No item found for id: ${id}`);
	}
	// Ensure ingredientDb is an object if Mixture.deserialize expects that
	const ingredientDbForMixture = typeof item.ingredientDb === 'string'
		? JSON.parse(item.ingredientDb)
		: item.ingredientDb;

	return Mixture.deserialize(item.rootMixtureId, ingredientDbForMixture);
}

// Legacy 'delete' function name if needed for compatibility, points to deleteFile
export const deleteItem = deleteFile;
