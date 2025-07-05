/**
 * Server-side endpoint for manipulating stars.
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getDB } from '$lib/cf-bindings.js';

export const GET: RequestHandler = async ({ platform, locals }) => {
	if (!platform) {
		throw error(500, 'D1 not available in development mode');
	}
	const d1 = getDB(platform);
	const userId = locals.userId; // Populated by Clerk middleware

	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		const stmt = d1.prepare('SELECT id FROM mixture_stars WHERE userid = ?');
		const results = await stmt.bind(userId).all();
		const stars = results.results.map((row) => ({ id: row.id }));
		return json(stars);
	} catch (err: any) {
		console.error(`[Stars] Error processing list:`, err.message, err);
		throw error(500, `Failed to process GET: ${err.message}`);
	}
};
