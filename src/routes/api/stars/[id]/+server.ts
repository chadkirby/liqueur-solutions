/**
 * Server-side endpoint for listing a user's files.
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getDB } from '$lib/cf-bindings.js';

// star the mixture with the given id
export const PUT: RequestHandler = async ({ params, platform, locals }) => {
	const mixtureId = params.id;

	if (!platform) {
		throw error(500, 'D1 not available in development mode');
	}
	const d1 = getDB(platform);
	const userId = locals.userId; // Populated by Clerk middleware

	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		const stmt = d1.prepare(
			`INSERT OR REPLACE INTO mixture_stars (userid, id) VALUES (?, ?)`
		);
		await stmt.bind(userId, mixtureId).run();
		return json({ ok: true });
	} catch (err: any) {
		console.error(`[PUT] Error processing star:`, err.message, err);
		throw error(err.status ? err.status : 500, `Failed to process PUT: ${err.message}`);
	}
};

// unstar the mixture with the given id
export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	const mixtureId = params.id;

	if (!platform) {
		throw error(500, 'D1 not available in development mode');
	}
	const d1 = getDB(platform);
	const userId = locals.userId; // Populated by Clerk middleware

	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		const stmt = d1.prepare(
			'DELETE FROM mixture_stars WHERE userid = ? AND id = ?'
		);
		await stmt.bind(userId, mixtureId).run();
		return json({ ok: true });
	} catch (err: any) {
		console.error(`[DELETE] Error processing star:`, err.message, err);
		throw error(500, `Failed to process DELETE: ${err.message}`);
	}
};
