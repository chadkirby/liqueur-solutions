import { Mixture } from './mixture.js';
import { SchemaCollection } from '$lib/schema-collection.js';
import svelteReactivityAdapter from '@signaldb/svelte';
import createIndexedDBAdapter from '@signaldb/indexeddb';
import { z } from 'zod/v4-mini';
import {
	createFileDataV2,
	zFileDataV2,
	zIngredientItem,
	type FileDataV2,
	type IngredientItemData,
} from '$lib/data-format.js';
import { browser } from '$app/environment';
import { syncManager } from './sync-manager.js';

export function deserialize(item: FileDataV2, ingredients: IngredientItemData[]): FileDataV2 {
	// make sure we have a valid ingredientHash (older files might not have it)
	const _ingredientHash =
		item._ingredientHash ??
		Mixture.deserialize(item.rootIngredientId, ingredients).getIngredientHash(item.name);

	// Ensure accessTime is a valid ISO string
	const accessTime = new Date(item.accessTime).toISOString();

	const copy = { ...item };
	delete (copy as any).ingredientJSON; // remove old field if it exists

	return {
		...copy,
		accessTime,
		_ingredientHash,
	} as const;
}

const starSchema = z.strictObject({
	id: z.string(),
});

let mixturesCollection: SchemaCollection<typeof zFileDataV2, string> | null = null;
function getMixturesCollection() {
	if (!browser) return null; // Ensure this runs only in the browser
	if (!mixturesCollection) {
		mixturesCollection = new SchemaCollection({
			schema: zFileDataV2,
			reactivity: svelteReactivityAdapter,
			persistence: createIndexedDBAdapter<FileDataV2, string>('mixtures'),
		});
		syncManager.addCollection(mixturesCollection, {
			name: 'mixtureFiles',
			apiPath: '/api/mixtures',
		});
	}
	return mixturesCollection;
}

let starsCollection: SchemaCollection<typeof starSchema, string> | null = null;
function getStarsCollection() {
	if (!browser) return null; // Ensure this runs only in the browser
	if (!starsCollection) {
		starsCollection = new SchemaCollection({
			schema: starSchema,
			reactivity: svelteReactivityAdapter,
			persistence: createIndexedDBAdapter<z.infer<typeof starSchema>, string>('mixture-stars'),
		});
		syncManager.addCollection(starsCollection, {
			name: 'stars',
			apiPath: '/api/stars',
		});
	}
	return starsCollection;
}

const ingredientsCollections: Map<
	string,
	SchemaCollection<typeof zIngredientItem, string>
> = new Map();
function getIngredientsCollection(id: string) {
	if (!browser) return null; // Ensure this runs only in the browser
	if (!ingredientsCollections.has(id)) {
		ingredientsCollections.set(
			id,
			new SchemaCollection({
				schema: zIngredientItem,
				reactivity: svelteReactivityAdapter,
				persistence: createIndexedDBAdapter<IngredientItemData, string>(`ingredient-db-${id}`),
			}),
		);
		syncManager.addCollection(ingredientsCollections.get(id)!, {
			name: `ingredients-${id}`,
			apiPath: `/api/ingredients/${id}`,
		});
	}
	return ingredientsCollections.get(id)!;
}

export const persistenceContext = {
	get mixtureFiles() {
		return getMixturesCollection();
	},
	get stars() {
		return getStarsCollection();
	},
	getIngredientsCollection(id: string) {
		return getIngredientsCollection(id);
	},
	async isReady() {
		if (!browser) return; // Ensure this runs only in the browser
		await Promise.all([
			getMixturesCollection()?.isReady(),
			getStarsCollection()?.isReady(),
			...Array.from(ingredientsCollections.values()).map((col) => col.isReady()),
		]);
	},
	upsertFile(item: { id: string; name: string; mixture: Mixture }) {
		const mixturesCollection = getMixturesCollection();
		const ingredientsCollections = getIngredientsCollection(item.id);
		if (!mixturesCollection || !ingredientsCollections) {
			// browser
			return;
		}
		const data = createFileDataV2(item);
		const serialized = item.mixture.serialize();

		mixturesCollection.replaceOne({ id: item.id }, data, { upsert: true });

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
				const existing = existingIngredients.find((ing) => ing.id === ingredient.id);
				if (existing && deepEqual(existing.item, ingredient.item)) {
					// No change, skip
					continue;
				}
				// Upsert the ingredient
				ingredientsCollections.replaceOne({ id: ingredient.id }, ingredient, { upsert: true });
			}
		});
		return data;
	},
	toggleStar(id: string) {
		const starsCollection = getStarsCollection();
		if (!starsCollection) return false; // browser
		const existing = starsCollection.findOne({ id });
		if (existing) {
			starsCollection.removeOne({ id });
			return false;
		} else {
			starsCollection.insert({ id });
			return true;
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
