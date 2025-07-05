import type { R2Bucket } from './cf-bindings.js';
import type { Clerk } from '@clerk/clerk-js';
import type { UserResource } from '@clerk/types';
import type { Writable } from 'svelte/store';
import { SchemaCollection } from '$lib/schema-collection.js';
import svelteReactivityAdapter from '@signaldb/svelte';
import createIndexedDBAdapter from '@signaldb/indexeddb';
import { z } from 'zod/v4-mini';
import { zFileDataV2, zIngredientItem, type FileDataV2 } from '$lib/data-format.js';
import type { IngredientItem } from './mixture-types.js';
import type { Mixture } from './mixture.js';

export const BUCKET_CONTEXT_KEY = Symbol('r2bucket');

export type BucketContext = {
	bucket: R2Bucket | undefined;
};

export const CLERK_CONTEXT_KEY = Symbol('clerk');
export type ClerkContext = {
	instance: Writable<Clerk | null>;
	user: Writable<UserResource | null>;
};

const starSchema = z.strictObject({
	id: z.string(),
});

export function createMixturesCollection() {
	return new SchemaCollection({
		schema: zFileDataV2,
		reactivity: svelteReactivityAdapter,
		persistence: createIndexedDBAdapter<FileDataV2, string>('mixtures'),
	});
}

export function createStarsCollection() {
	return new SchemaCollection({
		schema: starSchema,
		reactivity: svelteReactivityAdapter,
		persistence: createIndexedDBAdapter<z.infer<typeof starSchema>, string>('mixture-stars'),
	});
}

export function createIngredientsCollection(id: string) {
	return new SchemaCollection({
		schema: zIngredientItem,
		reactivity: svelteReactivityAdapter,
		persistence: createIndexedDBAdapter<IngredientItem, string>(`ingredient-db-${id}`),
	});
}

export const PERSISTENCE_CONTEXT_KEY = Symbol('persistence');
export type PersistenceContext = {
	mixtureFiles: ReturnType<typeof createMixturesCollection> | null;
	stars: ReturnType<typeof createStarsCollection> | null;
	ingredients: ReturnType<typeof createIngredientsCollection> | null;
	upsertFile: (item: { id: string; name: string; mixture: Mixture }) => void;
	toggleStar: (id: string) => boolean;
};
