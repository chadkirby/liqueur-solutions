// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { R2Bucket } from '@cloudflare/workers-types';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			userId?: string;
		}
		// interface PageData {}

		/**
		 * Platform-specific context from Cloudflare.
		 *
		 * The env property contains bindings configured in wrangler.toml:
		 * ```toml
		 * [[r2_buckets]]
		 * binding = 'MIXTURE_BUCKET'          # Name used in code
		 * bucket_name = 'mixture-files'       # Production bucket
		 * preview_bucket_name = 'mixture-files-dev'  # Dev bucket
		 * ```
		 */
		interface Platform {
			env?: {
				/** R2 bucket for mixture files. Binding configured in wrangler.toml */
				MIXTURE_BUCKET?: R2Bucket;
				[key: string]: unknown;
			};
		}
	}
}

export {};
