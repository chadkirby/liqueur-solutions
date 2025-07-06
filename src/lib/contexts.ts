import type { R2Bucket } from './cf-bindings.js';
import type { Clerk } from '@clerk/clerk-js';
import type { UserResource } from '@clerk/types';
import type { Writable } from 'svelte/store';
import type { MixtureStore } from './mixture-store.svelte.js';

export const BUCKET_CONTEXT_KEY = Symbol('r2bucket');

export type BucketContext = {
	bucket: R2Bucket | undefined;
};

export const CLERK_CONTEXT_KEY = Symbol('clerk');
export type ClerkContext = {
	instance: Writable<Clerk | null>;
	user: Writable<UserResource | null>;
};

export const MIXTURE_STORE_CONTEXT_KEY = Symbol('mixtureStore');
export type MixtureStoreContext = MixtureStore;
