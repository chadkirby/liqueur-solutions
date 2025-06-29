import { Mixture } from './mixture.js';
import { browser } from '$app/environment';
import {
	currentDataVersion,
	zFileDataV1,
	type FileDataV1,
	type IngredientDbEntry,
} from '$lib/data-format.js';
import svelteReactivityAdapter from '@signaldb/svelte';
import { SchemaCollection } from './schema-collection.js';
import createIndexedDBAdapter from '@signaldb/indexeddb';
import { isStorageId, type StorageId } from './storage-id.js';
import { z } from 'zod/v4-mini';

export const MixtureFiles = browser
	? new SchemaCollection({
			schema: zFileDataV1,
			reactivity: svelteReactivityAdapter,
			persistence: createIndexedDBAdapter<FileDataV1, string>('temp-files'),
		})
	: null;

const starSchema = z.strictObject({
	id: z.string(),
});
export const Stars = browser
	? new SchemaCollection({
			schema: starSchema,
			reactivity: svelteReactivityAdapter,
			persistence: createIndexedDBAdapter<FileDataV1, string>('stars'),
		})
	: null;

export function isStarred(id: StorageId): boolean {
	if (!Stars) return false;
	const star = Stars.findOne({ id });
	return star !== undefined;
}

export function deserialize(item: FileDataV1): FileDataV1 {
	// some interim files have ingredientJSON instead of ingredientDb
	const ingredientDb: IngredientDbEntry[] =
		'ingredientJSON' in item ? JSON.parse(item.ingredientJSON as string) : item.ingredientDb;
	// make sure we have a valid ingredientHash (older files might not have it)
	const _ingredientHash =
		item._ingredientHash ??
		Mixture.deserialize(item.rootMixtureId, ingredientDb).getIngredientHash(item.name);

	// Ensure accessTime is a valid ISO string
	const accessTime = new Date(item.accessTime).toISOString();

	const copy = { ...item };
	delete (copy as any).ingredientJSON; // remove old field if it exists

	return {
		...copy,
		accessTime,
		ingredientDb: [...ingredientDb],
		_ingredientHash,
	} as const;
}

export function loadMixture(id: StorageId): Mixture | null {
	if (!MixtureFiles) return null;
	if (!isStorageId(id)) {
		throw new Error('Invalid StorageId: ' + id);
	}
	const file = MixtureFiles.findOne({ id });
	if (!file) return null;
	// update access time
	const now = new Date().toISOString();
	MixtureFiles.updateOne({ id }, { $set: { accessTime: now } });
	return Mixture.deserialize(file.rootMixtureId, file.ingredientDb);
}

export function deleteFile(id: StorageId): void {
	MixtureFiles?.removeOne({ id });
	Stars?.removeOne({ id });
}

/**
 * Write (upsert) a file record into the MixtureFiles collection.
 */
export async function insertFile(item: {
	id: string;
	name: string;
	mixture: Mixture;
}): Promise<void> {
	if (!MixtureFiles) return;
	if (!isStorageId(item.id)) return;
	MixtureFiles.replaceOne(
		{ id: item.id },
		{
			version: currentDataVersion,
			id: item.id,
			name: item.name,
			accessTime: new Date().toISOString(),
			desc: item.mixture.describe(),
			rootMixtureId: item.mixture.id,
			ingredientDb: item.mixture.serialize(),
			_ingredientHash: item.mixture.getIngredientHash(item.name),
		},
		{
			upsert: true,
		},
	);
}

export async function toggleStar(id: StorageId): Promise<boolean> {
	if (!Stars) return false;
	const isStarred = await Stars.findOne({ id });
	if (isStarred) {
		Stars.removeOne({ id });
		return false; // Unstarred successfully
	} else {
		Stars.insert({ id });
		return true; // Starred successfully
	}
}

export async function runJanitor(stars: Set<string>): Promise<void> {
	if (!MixtureFiles) return;
	const aMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
	try {
		const files = MixtureFiles.find({ accessTime: { $lt: aMonthAgo } }, { fields: { id: 1 } });
		files.forEach(({ id }) => {
			if (!stars.has(id)) {
				MixtureFiles.removeOne({ id });
			}
		});
	} catch (e) {
		console.error('FilesDb janitor error', e);
	}
}

export function hasEquivalentItem(ingredientHash: string): boolean {
	if (!MixtureFiles) return false;
	const file = MixtureFiles.findOne({ _ingredientHash: ingredientHash });
	return file !== undefined;
}

export function getName(id: StorageId): string {
	const f = MixtureFiles?.findOne({ id });
	return f?.name || '';
}
