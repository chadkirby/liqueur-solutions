/**
 * Server-side endpoint for GET/PUT/DELETE a user's ingredient item from D1.
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getDB } from '$lib/cf-bindings.js';
import { zIngredientItem } from '$lib/data-format.js';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
	const ingdtId = params.id;

	if (!platform) {
		throw error(500, 'D1 not available in development mode');
	}
	const d1 = getDB(platform);
	const userId = locals.userId; // Populated by Clerk middleware

	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		const stmt = d1.prepare('SELECT data FROM ingredients WHERE userid = ? AND id = ?');
		const result = await stmt.bind(userId, ingdtId).first();
		if (!result) {
			throw error(404, { message: `Ingredient not found for id: ${ingdtId}` });
		}
		const parsed = zIngredientItem.safeParse(JSON.parse(result.data as string));
		if (!parsed.success) {
			throw error(
				400,
				`Invalid data for id: ${ingdtId}` +
					(parsed.error.issues.length
						? `; Details: ${parsed.error.issues
								.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
								.join(', ')}`
						: ''),
			);
		}
		return json(parsed.data);
	} catch (err: any) {
		console.error(`[GET] Error processing ingredient:`, err.message, err);
		throw error(err.status ? err.status : 500, `Failed to process GET: ${err.message}`);
	}
};

// update the ingredient with the given id
export const PUT: RequestHandler = async ({ params, request, platform, locals }) => {
	const ingdtId = params.id;

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
		const parsedData = zIngredientItem.safeParse(rawData);
		if (!parsedData.success) {
			console.error(`[PUT] Invalid data for id: ${ingdtId}`, parsedData.error.issues);
			throw error(400, `Invalid data for id: ${ingdtId}`);
		}
		const item = parsedData.data;
		// mixture_id is required, for both MixtureData and SubstanceData
		let mixture_id = null;
		if ('ingredients' in item && Array.isArray(item.ingredients)) {
			// MixtureData: use item.id as mixture_id
			mixture_id = item.id;
		} else if ('id' in item) {
			// SubstanceData: use item.id as mixture_id
			mixture_id = item.id;
		}
		if (!mixture_id) {
			throw error(400, `mixture_id could not be determined for id: ${ingdtId}`);
		}
		const stmt = d1.prepare(
			`INSERT OR REPLACE INTO ingredients (userid, id, mixture_id, data)
			 VALUES (?, ?, ?, ?)`,
		);
		await stmt.bind(userId, ingdtId, mixture_id, JSON.stringify(item)).run();
		return json({ ok: true });
	} catch (err: any) {
		console.error(`[PUT] Error processing ingredient:`, err.message, err);
		throw error(err.status ? err.status : 500, `Failed to process PUT: ${err.message}`);
	}
};

// delete the ingredient with the given id
export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	const ingdtId = params.id;

	if (!platform) {
		throw error(500, 'D1 not available in development mode');
	}
	const d1 = getDB(platform);
	const userId = locals.userId; // Populated by Clerk middleware

	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		const stmt = d1.prepare('DELETE FROM ingredients WHERE userid = ? AND id = ?');
		await stmt.bind(userId, ingdtId).run();
		return json({ ok: true });
	} catch (err: any) {
		console.error(`[DELETE] Error processing ingredient:`, err.message, err);
		throw error(500, `Failed to process DELETE: ${err.message}`);
	}
};
