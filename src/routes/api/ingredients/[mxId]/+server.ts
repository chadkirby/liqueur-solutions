/**
 * Server-side endpoint for GET a user's ingredient item from D1.
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getDB } from '$lib/cf-bindings.js';
import { zIngredientItem } from '$lib/data-format.js';

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

	const stmt = d1.prepare('SELECT data FROM ingredients WHERE userid = ? AND mx_id = ?');
	const result = await stmt.bind(userId, mxId).first();
	if (!result) {
		throw error(404, { message: `Ingredient not found for id: ${mxId}` });
	}
	const parsed = zIngredientItem.safeParse(JSON.parse(result.data as string));
	if (!parsed.success) {
		throw error(
			400,
			`Invalid data for id: ${mxId}` +
				(parsed.error.issues.length
					? `; Details: ${parsed.error.issues
							.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
							.join(', ')}`
					: ''),
		);
	}
	return json(parsed.data);
};
