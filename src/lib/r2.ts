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
	if (!bucket) {
		throw new Error(`R2 bucket binding ${R2_BINDING} not found in platform.env`);
	}
	return bucket;
}
