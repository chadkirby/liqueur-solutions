/**
 * Server-side endpoint for GET a user's ingredient item from D1.
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getDB } from '$lib/cf-bindings.js';
import { getAllIngredients } from '$lib/api-utils.js';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
	const mxId = params.mxId;

	if (!platform) {
		throw error(500, 'D1 not available in development mode');
	}
	const d1 = getDB(platform);
	const userId = locals.userId; // Populated by Clerk middleware

	if (!userId) {
		throw error(401, 'Unauthorized');
	}
	if (!mxId) {
		throw error(400, 'Missing mxId');
	}

	const { ingredients } = await getAllIngredients(d1, { userId, mxId });
	if (!ingredients || !ingredients.length) {
		throw error(404, { message: `No ingredients found for mixture id: ${mxId}` });
	}
	return json(ingredients);
};

export const DELETE: RequestHandler = async ({ params, request, platform, locals }) => {
	const mxId = params.mxId;
	if (!mxId) {
		throw error(400, 'Missing mxId');
	}
	if (!platform) {
		throw error(500, 'D1 not available in development mode');
	}
	const d1 = getDB(platform);
	const userId = locals.userId; // Populated by Clerk middleware

	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		const stmt = d1.prepare('DELETE FROM ingredients WHERE userid = ? AND mx_id = ?');
		await stmt.bind(userId, mxId).run();
		return json({ ok: true });
	} catch (err: any) {
		console.error(`[DELETE] Error processing ingredient:`, err.message, err);
		throw error(500, `Failed to process DELETE: ${err.message}`);
	}
};
