import type { R2Bucket } from './r2.js';
import type { Clerk } from '@clerk/clerk-js';
import type { UserResource } from '@clerk/types';
import type { Writable } from 'svelte/store';
import { SchemaCollection } from '$lib/schema-collection.js';
import svelteReactivityAdapter from '@signaldb/svelte';
import createIndexedDBAdapter from '@signaldb/indexeddb';
import { z } from 'zod/v4-mini';
import { zFileDataV1, type FileDataV1 } from '$lib/data-format.js';

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
		schema: zFileDataV1,
		reactivity: svelteReactivityAdapter,
		persistence: createIndexedDBAdapter<FileDataV1, string>('mixtures'),
	});
}

export function createStarsCollection() {
	return new SchemaCollection({
		schema: starSchema,
		reactivity: svelteReactivityAdapter,
		persistence: createIndexedDBAdapter<FileDataV1, string>('mixture-stars'),
	});
}

export const PERSISTENCE_CONTEXT_KEY = Symbol('persistence');
export type PersistenceContext = {
	mixtureFiles: ReturnType<typeof createMixturesCollection> | null;
	stars: ReturnType<typeof createStarsCollection> | null;
	upsertFile: (item: { id: string; name: string; mixture: any }) => void;
	toggleStar: (id: string) => boolean;
};
