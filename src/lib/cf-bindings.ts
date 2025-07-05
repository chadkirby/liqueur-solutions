import type { R2Bucket, D1Database } from '@cloudflare/workers-types/2023-07-01';
export type * from '@cloudflare/workers-types/2023-07-01';

/**
 * Cloudflare R2 bucket configuration and access.
 *
 * The R2 bucket is configured in wrangler.toml:
 * ```toml
 * [[r2_buckets]]
 * binding = 'MIXTURE_BUCKET'          # Name we use in code to access the bucket
 * bucket_name = 'mixture-files'       # Production bucket in Cloudflare
 * preview_bucket_name = 'mixture-files-dev'  # Local dev bucket
 * ```
 *
 * Setup:
 * 1. Create the buckets in Cloudflare dashboard (R2 section)
 * 2. Configure in wrangler.toml as above
 * 3. Access via platform.env.MIXTURE_BUCKET in server-side code
 *
 * - Local dev (`wrangler dev`): Uses mixture-files-dev bucket
 * - Production: Uses mixture-files bucket
 * - Only available in server-side code (API routes, hooks, etc.)
 */

// Name of the R2 binding from wrangler.toml
const R2_BINDING = 'MIXTURE_BUCKET';

/**
 * Get the R2 bucket from Cloudflare platform bindings.
 * The bucket object provides methods like list(), put(), get(), delete().
 *
 * @example
 * ```ts
 * // In a +server.ts file:
 * const bucket = getR2Bucket(platform);
 * await bucket.put('key', data);
 * const item = await bucket.get('key');
 * ```
 */
export function getR2Bucket(platform: App.Platform) {
	const bucket = platform?.env?.[R2_BINDING];
	if (!bucket || typeof bucket === 'string' || !('put' in bucket)) {
		throw new Error(`Invalid R2 bucket binding for ${R2_BINDING}`);
	}
	return bucket as R2Bucket;
}

const MIXTURES_DB_BINDING = 'MIXTURES_DB';
const INGREDIENTS_DB_BINDING = 'INGREDIENTS_DB';
const STARS_DB_BINDING = 'STARS_DB';

export function getDB(platform: App.Platform, which: 'mixtures' | 'ingredients' | 'stars' ) {
	const db = platform?.env?.[MIXTURES_DB_BINDING];
	if (!db || typeof db === 'string' || !('prepare' in db)) {
		throw new Error(`Invalid D1 database binding for ${MIXTURES_DB_BINDING}`);
	}
	return db as D1Database;
}
