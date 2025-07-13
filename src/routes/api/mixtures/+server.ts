/**
 * Server-side endpoint for listing a user's files.
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getDB, type D1Result } from '$lib/cf-bindings.js';
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

	let results: D1Result<Record<string, unknown>>;
	try {
		const stmt = d1.prepare(`SELECT * FROM mixtures WHERE userid = ?`);
		results = await stmt.bind(userId).all();
	} catch (err: any) {
		console.error(`[Mixtures] Error processing list:`, err.message, err);
		throw error(500, `Failed to process GET: ${err.message}`);
	}
	const validMixtures = [];
	const errorMessages: string[] = [];
	for (const row of results.results) {
		row.starred = Boolean(row.starred); // Ensure starred is a boolean
		// Remove userid field before validation since it's not part of the data model
		const { userid, ...dataWithoutUserId } = row;
		console.log(`[Mixtures] Processing row:`, dataWithoutUserId);
		const parsed = zFileDataV2.safeParse(dataWithoutUserId);
		if (parsed.success) {
			validMixtures.push(parsed.data);
		} else {
			const msg = `[Mixtures] Invalid data for id: ${row.id}. Issues: ${parsed.error.issues
				.map((issue) => JSON.stringify(issue))
				.join(', ')}\n\nRow data: ${JSON.stringify(dataWithoutUserId)}`;
			errorMessages.push(msg);
		}
	}
	if (errorMessages.length && !validMixtures.length) {
		throw error(400, errorMessages.join('\n'));
	}

	return json(validMixtures);
};
