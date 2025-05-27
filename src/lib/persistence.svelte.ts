import { Mixture } from './mixture.js';
import { browser } from '$app/environment';
import {
	currentDataVersion,
	fileSchemaV1,
	fileSyncSchema,
	type DeserializedFileDataV1,
	type FileSyncMeta,
	type SerializedFileDataV1,
} from '$lib/data-format.js';
import svelteReactivityAdapter from '@signaldb/svelte';
import { SchemaCollection } from './schema-collection.js';
import createIndexedDBAdapter from '@signaldb/indexeddb';
import { isStorageId, type StorageId } from './storage-id.js';

export const TempFiles = browser
	? new SchemaCollection({
			schema: fileSchemaV1,
			reactivity: svelteReactivityAdapter,
			persistence: createIndexedDBAdapter<SerializedFileDataV1, string>('temp-files'),
		})
	: null;

export const SyncMeta = browser
	? new SchemaCollection({
			schema: fileSyncSchema,
			reactivity: svelteReactivityAdapter,
			persistence: createIndexedDBAdapter<FileSyncMeta, StorageId>('file-sync-meta'),
		})
	: null;

export function deserialize(item: SerializedFileDataV1): DeserializedFileDataV1 {
	const { ingredientJSON, ...rest } = item;
	return {
		...rest,
		ingredientDb: JSON.parse(ingredientJSON),
	};
}

function serialize(item: DeserializedFileDataV1): SerializedFileDataV1 {
	if (!isStorageId(item.id)) {
		throw new Error('Invalid item provided for serialization');
	}
	const { ingredientDb, ...rest } = item;
	return {
		...rest,
		ingredientJSON: JSON.stringify(ingredientDb),
	};
}

const upsert = true;

export async function toggleStar(id: StorageId): Promise<boolean> {
	if (!SyncMeta) return false;
	const starredResp = await fetch(`../api/mixtures/${id}/star`);
	if (starredResp.ok) {
		await deleteCloudFile(id);
		return false; // Unstarred successfully
	} else if (starredResp.status === 404) {
		await writeCloudFile(id);
		return true; // Starred successfully
	} else {
		throw new Error('FilesDb: Failed to toggle star for id ' + id + ': ' + starredResp.statusText);
	}
}

export async function writeCloudFile(id: StorageId): Promise<void> {
	if (!TempFiles) return;
	const file = TempFiles.findOne({ id });
	if (!file) {
		console.warn('FilesDb: no row found for id', id);
		return;
	}
	const data = await readTempFile(id);
	if (!data) {
		console.warn('FilesDb: no data found for id', id);
		return;
	}
	const serialized = serialize(data);
	await putMx(serialized);
}

async function deleteCloudFile(id: StorageId): Promise<void> {
	if (!SyncMeta) return;
	const response = await fetch(`../api/mixtures/${id}`, {
		method: 'DELETE',
	});
	if (!response.ok) {
		console.error('Failed to delete mixture from cloud:', response.statusText);
		return;
	}

	SyncMeta.removeOne({ id }); // Remove sync meta for this id
	console.log('FilesDb: deleted mixture from cloud and local store for id', id);
}

async function putMx(data: SerializedFileDataV1): Promise<void> {
	if (!SyncMeta) return;
	const sync = await SyncMeta.findOne({ id: data.id });
	const response = await fetch(`../api/mixtures/${data.id}`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			'X-Last-Sync-Time': sync?.lastSyncTime?.toString() || new Date(0).toISOString(),
		},
		body: JSON.stringify(data),
	});
	// handle precondition failed
	if (response.status === 412 && confirm(await response.text())) {
		// User confirmed to overwrite
		console.log('User confirmed to overwrite the mixture');
		// update the lastSyncTime to now
		SyncMeta.replaceOne(
			{ id: data.id },
			{
				id: data.id,
				lastSyncTime: new Date().toISOString(),
				lastSyncHash: data._ingredientHash,
			},
			{ upsert },
		);
		// Retry the PUT request
		return putMx(data);
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
		SyncMeta.replaceOne(
			{ id: data.id },
			{
				id: data.id,
				lastSyncTime: new Date(responseData.lastSyncTime).toISOString(),
				lastSyncHash: responseData.lastSyncHash,
			},
			{ upsert },
		);
	} else {
		console.error('Failed to save mixture to cloud:', responseData);
	}
}

async function readCloudFile(id: StorageId): Promise<DeserializedFileDataV1 | null> {
	if (!SyncMeta) return null;
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

	const lastSyncTime = response.headers.get('X-Last-Sync-Time');
	const lastSyncHash = response.headers.get('X-Last-Sync-Hash');
	if (lastSyncTime && lastSyncHash) {
		SyncMeta.replaceOne(
			{ id: data.id },
			{
				id: data.id,
				lastSyncTime: new Date(lastSyncTime).toISOString(),
				lastSyncHash: lastSyncHash,
			},
			{ upsert },
		);
	}

	return deserialize(data);
}

export async function runJanitor(stars: Set<string>): Promise<void> {
	if (!TempFiles) return;
	const aMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
	try {
		const files = TempFiles.find({ accessTime: { $lt: aMonthAgo } }, { fields: { id: 1 } });
		files.forEach(({ id }) => {
			if (!stars.has(id)) {
				TempFiles.removeOne({ id });
			}
		});
	} catch (e) {
		console.error('FilesDb janitor error', e);
	}
}

export async function hasEquivalentItem(ingredientHash: string): Promise<boolean> {
	if (!TempFiles) return false;
	const file = TempFiles.findOne({ _ingredientHash: ingredientHash });
	return file !== undefined;
}
/**
 * Read a stored file by ID from the TempFiles collection.
 */
export async function readTempFile(id: StorageId): Promise<DeserializedFileDataV1 | null> {
	if (!TempFiles) return null;
	if (!isStorageId(id)) return null;
	const file = TempFiles.findOne({ id });
	if (!file) {
		console.warn(`FilesDb: No file found for id ${id}`);
		return null; // Not found
	}
	try {
		return deserialize(file);
	} catch (e) {
		console.warn(`FilesDb: failed to parse JSON for id ${id}`, e);
		return null;
	}
}
/**
 * Write (upsert) a file record into the TempFiles collection.
 */
export async function writeTempFile(item: {
	id: string;
	name: string;
	mixture: Mixture;
}): Promise<void> {
	if (!TempFiles) return;
	if (!isStorageId(item.id)) return;
	TempFiles.replaceOne(
		{ id: item.id },
		serialize({
			version: currentDataVersion,
			id: item.id,
			name: item.name,
			accessTime: new Date().toISOString(),
			desc: item.mixture.describe(),
			rootMixtureId: item.mixture.id,
			ingredientDb: item.mixture.serialize(),
			_ingredientHash: item.mixture.getIngredientHash(item.name),
		}),
		{
			upsert,
		},
	);
}

export function deleteTempFile(id: StorageId): void {
	if (!TempFiles) return;
	if (!isStorageId(id)) return;
	TempFiles.removeOne({ id });
}

export async function readFile(id: string): Promise<Mixture> {
	if (!isStorageId(id)) throw new Error('Invalid id');
	const f = await readTempFile(id);
	if (f) return Mixture.deserialize(f.rootMixtureId, f.ingredientDb);

	if (browser) {
		// If we didn't find it in the local store, try to fetch it from the cloud
		console.warn('FilesDb: Mixture not found in local store, fetching from cloud');
		const mx = await readCloudFile(id);
		if (!mx) {
			throw new Error(`FilesDb: No row found for id ${id}`);
		}
		const mixture = Mixture.deserialize(mx.rootMixtureId, mx.ingredientDb);
		// If we found the mixture in the cloud, write it to the local store
		await writeTempFile({
			id: mx.id,
			name: mx.name,
			mixture,
		});
		return mixture;
	}

	throw new Error(`No mixture found for id ${id}`);
}

export function setSyncMeta(meta: FileSyncMeta[]): void {
	if (!SyncMeta) return;
	SyncMeta.removeMany({}); // Clear existing sync meta
	SyncMeta.insertMany(meta);
}

export async function getName(id: StorageId): Promise<string> {
	const f = await readTempFile(id);
	return f?.name || '';
}
