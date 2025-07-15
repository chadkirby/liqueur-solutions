/**
 * Server-side endpoint for listing a user's files.
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getDB } from '$lib/cf-bindings.js';
import { zFileDataV2 } from '$lib/data-format.js';
import { getMixture } from '$lib/api-utils.js';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
	const mixtureId = params.id;

	if (!platform) {
		throw error(500, 'D1 not available in development mode');
	}
	const d1 = getDB(platform);
	const userId = locals.userId; // Populated by Clerk middleware

	if (!userId) {
		throw error(401, 'Unauthorized');
	}
	if (!mixtureId) {
		throw error(400, 'Missing mixture id');
	}

	const parsed = await getMixture(d1, { userId, mxId: mixtureId });
	if (!parsed.success) {
		throw error(
			400,
			`Invalid data for id: ${mixtureId}` +
				(parsed.error.issues.length
					? `; Details: ${parsed.error.issues
							.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
							.join(', ')}`
					: ''),
		);
	}
	return json(parsed.data);
};

// update the mixture with the given id
export const PUT: RequestHandler = async ({ params, request, platform, locals }) => {
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
		const rawData = await request.json();
		const parsedData = zFileDataV2.safeParse(rawData);
		if (!parsedData.success) {
			console.error(`[PUT] Invalid mixture data for id: ${mixtureId}`, parsedData.error.issues);
			throw error(
				400,
				`Invalid mixture data for id: ${mixtureId}: ${JSON.stringify(parsedData.error.issues)}`,
			);
		}
		const item = parsedData.data;

		// Get field names dynamically from the validated data
		const fields = Object.keys(item);
		const stmt = d1.prepare(
			`INSERT OR REPLACE INTO mixtures (userid, ${fields.join(', ')})
			 VALUES (?, ${fields.map(() => '?').join(', ')})`,
		);
		await stmt.bind(userId, ...fields.map((field) => item[field as keyof typeof item])).run();
		return json({ ok: true });
	} catch (err: any) {
		console.error(`[PUT] Error processing mixture:`, err.message, err);
		throw error(err.status ? err.status : 500, `Failed to process PUT: ${err.message}`);
	}
};

// delete the mixture with the given id
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
		const stmt = d1.prepare('DELETE FROM mixtures WHERE userid = ? AND id = ?');
		await stmt.bind(userId, mixtureId).run();
		return json({ ok: true });
	} catch (err: any) {
		console.error(`[DELETE] Error processing mixture:`, err.message, err);
		throw error(500, `Failed to process DELETE: ${err.message}`);
	}
};
