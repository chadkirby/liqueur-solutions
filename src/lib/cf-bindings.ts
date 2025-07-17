import type { D1Database } from '@cloudflare/workers-types/2023-07-01';
export type * from '@cloudflare/workers-types/2023-07-01';

export function getDB(platform: App.Platform) {
	const db = platform?.env?.['MIXTURES_DB'];
	if (!db || typeof db === 'string' || !('prepare' in db)) {
		console.error('Invalid D1 database binding:', db, platform);
		throw new Error(`Invalid D1 database binding`);
	}
	return db as D1Database;
}
