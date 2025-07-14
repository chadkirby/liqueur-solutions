// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import type { D1Database } from '@cloudflare/workers-types/2023-07-01';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			userId?: string;
			db?: {
				mixtures?: D1Database;
				ingredients?: D1Database;
				stars?: D1Database;
			};
		}
		// interface PageData {}

		/**
		 * Platform-specific context from Cloudflare.
		 *
		 * The env property contains bindings configured in wrangler.toml:
		 */
		interface Platform {
			env?: {
				/** D1 database for mixture files */
				MIXTURES_DB?: D1Database;
				[key: string]: unknown;
			};
		}
	}
}

export {};
