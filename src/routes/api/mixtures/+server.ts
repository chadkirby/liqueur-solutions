/**
 * Server-side endpoint for listing a user's files.
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getDB } from '$lib/cf-bindings.js';
import { zFileDataV2 } from '$lib/data-format.js';

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
		const stmt = d1.prepare('SELECT version, id, name, accessTime, desc, rootIngredientId, _ingredientHash FROM mixtures WHERE userid = ?');
		const results = await stmt.bind(userId).all();
		const validMixtures = [];
		for (const row of results.results) {
			const parsed = zFileDataV2.safeParse(row);
			if (parsed.success) {
				validMixtures.push(parsed.data);
			} else {
				console.error(
					`[Mixtures] Invalid data for id: ${row.id}. Issues: ${parsed.error.issues
						.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
						.join(', ')}`,
				);
			}
		}
		return json(validMixtures);
	} catch (err: any) {
		console.error(`[Mixtures] Error processing list:`, err.message, err);
		throw error(500, `Failed to process GET: ${err.message}`);
	}
};
