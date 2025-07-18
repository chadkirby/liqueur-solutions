import { Mixture } from './mixture.js';
import { SchemaCollection } from '$lib/schema-collection.js';
import svelteReactivityAdapter from '@signaldb/svelte';
import createIndexedDBAdapter from '@signaldb/indexeddb';
import {
	createFileDataV2,
	zFileDataV2,
	zIngredientItem,
	type FileDataV2,
	type IngredientItemData,
	type UnifiedSerializationDataV2,
} from '$lib/data-format.js';
import { browser } from '$app/environment';
import { syncManager } from './sync-manager.js';

function listen(collection: SchemaCollection<any, any>, name: string) {
	const events = [
		'added',
		'changed',
		'removed',
		'persistence.init',
		// 'persistence.transmitted',
		// 'persistence.received',
		// 'persistence.pullStarted',
		// 'persistence.pullCompleted',
		// 'persistence.pushStarted',
		'persistence.pushCompleted',
	] as const;
	events.forEach((event) => {
		collection.on(event, () => {
			console.log(`[${name}] ${event}`);
		});
	});
}

let isSyncing = false;

const collections: Map<string, SchemaCollection<any, any>> = new Map();

function getMixturesCollection(): SchemaCollection<typeof zFileDataV2, string> | null {
	if (!browser) return null; // Ensure this runs only in the browser
	const collectionId = 'mixtures';
	if (!collections.has(collectionId)) {
		const collection = new SchemaCollection({
			schema: zFileDataV2,
			reactivity: svelteReactivityAdapter,
			persistence: createIndexedDBAdapter<FileDataV2, string>(collectionId),
		});
		syncManager.addCollection(collection, {
			name: collectionId,
			apiPath: '/api/mixtures',
		});
		listen(collection, collectionId);
		collections.set(collectionId, collection);
		if (isSyncing) syncManager.startSync(collectionId);
	}
	return collections.get('mixtures') ?? null;
}

function getIngredientsCollection(
	id: string,
): SchemaCollection<typeof zIngredientItem, string> | null {
	if (!browser) return null; // Ensure this runs only in the browser
	const collectionId = getIngredientsCollectionId(id);
	if (!collections.has(collectionId)) {
		const collection = new SchemaCollection({
			schema: zIngredientItem,
			reactivity: svelteReactivityAdapter,
			persistence: createIndexedDBAdapter<IngredientItemData, string>(ingredientsIndexedDbName(id)),
		});
		listen(collection, collectionId);
		collections.set(collectionId, collection);
		syncManager.addCollection(collection, {
			name: collectionId,
			apiPath: ingredientsEndpoint(id),
		});
		if (isSyncing) syncManager.startSync(collectionId);
	}
	return collections.get(collectionId) ?? null;
}

function getIngredientsCollectionId(id: string): string {
	return `ingredients-${id}`;
}
function ingredientsEndpoint(id: string) {
	return `/api/ingredients/${id}`;
}
function ingredientsIndexedDbName(id: string) {
	return `ingredient-db-${id}`;
}

export const persistenceContext = {
	get mixtureFiles() {
		return getMixturesCollection();
	},
	getIngredientsCollection(mxId: string) {
		return getIngredientsCollection(mxId);
	},
	async isReady() {
		if (!browser) return; // Ensure this runs only in the browser
		await Promise.all([
			syncManager.isReady(),
			...Array.from(collections.values()).map((c) => c.isReady()),
		]);
	},
	async startSync() {
		isSyncing = true;
		console.log('Starting sync for all collections');
		await syncManager.startAll();
		await syncManager.isReady();
	},
	async stopSync() {
		isSyncing = false;
		return await syncManager.pauseAll();
	},
	async dispose() {
		// Stop syncing and clear all collections
		isSyncing = false;
		await syncManager.dispose();
		await Promise.all(Array.from(collections.values()).map((collection) => collection.dispose()));
		collections.clear();
	},
	async getExportData(id: string): Promise<UnifiedSerializationDataV2 | null> {
		const mixturesCollection = getMixturesCollection();
		if (!mixturesCollection) return null; // browser
		const mx = mixturesCollection.findOne({ id }, { reactive: false });
		if (!mx) return null; // Not found
		const ingredientsCollection = getIngredientsCollection(id);
		if (!ingredientsCollection) return null; // No ingredients collection for this ID
		await persistenceContext.isReady();
		const ingredients = getIngredientsCollection(id)?.find({}).fetch() || [];
		return { mx, ingredients };
	},
	upsertMx(
		item: { id: string; name: string; mixture: Mixture; starred: boolean },
		extras?: Partial<FileDataV2>,
	) {
		const mixturesCollection = getMixturesCollection();
		const ingredientsCollections = getIngredientsCollection(item.id);
		if (!mixturesCollection || !ingredientsCollections) {
			// browser
			return;
		}
		const existing = mixturesCollection.findOne({ id: item.id }, { reactive: false });
		const data = createFileDataV2(item);
		if (!deepEqual(existing, data)) {
			mixturesCollection.replaceOne({ id: item.id }, { ...data, ...extras }, { upsert: true });
		}

		const serialized = item.mixture.serialize();
		const existingIngredients = ingredientsCollections.find({}).fetch();
		ingredientsCollections.batch(() => {
			// Remove ingredients that are no longer in the mixture
			for (const existing of existingIngredients) {
				const found = serialized.find((ing) => ing.id === existing.id);
				if (!found) {
					// Remove the ingredient if it no longer exists in the mixture
					ingredientsCollections.removeOne({ id: existing.id });
				}
			}
			// Upsert ingredients that are in the mixture
			// This will update existing ones and insert new ones
			for (const ingredient of serialized) {
				// Upsert the ingredient
				ingredientsCollections.replaceOne(
					{ id: ingredient.id },
					{ ...ingredient },
					{ upsert: true },
				);
			}
		});
		return data;
	},
	async removeMixture(id: string) {
		const mixturesCollection = getMixturesCollection();
		const existing = mixturesCollection?.findOne({ id }, { reactive: false });
		if (!existing) return false; // Not found, can't remove
		mixturesCollection?.removeOne({ id });
		const ingredientsCollection = getIngredientsCollection(id);
		if (ingredientsCollection) {
			ingredientsCollection.removeMany({}); // Remove all ingredients for this mixture
			const collectionId = getIngredientsCollectionId(id);
			collections.delete(collectionId); // Remove from collections map
			await syncManager.sync(collectionId); // Ensure sync is done
			await syncManager.pauseSync(collectionId); // Remove from sync manager
			await ingredientsCollection.dispose(); // Dispose the collection
		}
	},
	toggleStar(id: string) {
		const mixturesCollection = getMixturesCollection();
		if (!mixturesCollection) return; // browser
		const existing = mixturesCollection.findOne({ id }, { reactive: false });
		if (!existing) throw new Error('Mixture not found'); // Not found, can't toggle star
		const isStarred = existing.starred;
		console.log(`Toggling starred status for mixture ${id} from ${isStarred} to ${!isStarred}`);
		const replaced = mixturesCollection.replaceOne(
			{ id },
			{ ...existing, starred: !isStarred }, // Toggle starred status
		);
		console.log(`Replaced mixture ${id}:`, replaced);
		if (!replaced) {
			throw new Error(`Failed to toggle starred status for mixture ${id}`);
		}
	},
} as const;

/**
 * Efficient deep equality comparison that handles all JavaScript types
 */
function deepEqual(a: any, b: any): boolean {
	if (a === b) return true;

	if (a == null || b == null) return a === b;

	if (typeof a !== typeof b) return false;

	if (typeof a !== 'object') return false;

	if (Array.isArray(a) !== Array.isArray(b)) return false;

	if (Array.isArray(a)) {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (!deepEqual(a[i], b[i])) return false;
		}
		return true;
	}

	if (a instanceof Date && b instanceof Date) {
		return a.getTime() === b.getTime();
	}

	const keysA = Object.keys(a);
	const keysB = Object.keys(b);

	if (keysA.length !== keysB.length) return false;

	for (const key of keysA) {
		if (!keysB.includes(key)) return false;
		if (!deepEqual(a[key], b[key])) return false;
	}

	return true;
}
