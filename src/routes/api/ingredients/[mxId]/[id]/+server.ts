import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getDB } from '$lib/cf-bindings.js';
import { zIngredientItem } from '$lib/data-format.js';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  const mxId = params.mxId;
	if (!mxId) {
		throw error(400, 'Missing mxId');
	}
  const ingdtId = params.id;
  if (!ingdtId) {
		throw error(400, 'Missing ingdtId');
	}
  if (!platform) {
    throw error(500, 'D1 not available in development mode');
  }
  const d1 = getDB(platform);
  const userId = locals.userId; // Populated by Clerk middleware
  if (!userId) {
    throw error(401, 'Unauthorized');
  }
  const stmt = d1.prepare('SELECT data FROM ingredients WHERE userid = ? AND mx_id = ? AND id = ?');
  const result = await stmt.bind(userId, mxId, ingdtId).first();
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
}

// update the ingredient with the given id
export const PUT: RequestHandler = async ({ params, request, platform, locals }) => {
	const mxId = params.mxId;
	const ingdtId = params.id;
	if (!mxId || !ingdtId) {
		throw error(400, 'Missing mxId or ingdtId');
	}
	if (!platform) {
		throw error(500, 'D1 not available in development mode');
	}
	const d1 = getDB(platform);
	const userId = locals.userId; // Populated by Clerk middleware

	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const rawData = await request.json();
	const parsedData = zIngredientItem.safeParse(rawData);
	if (!parsedData.success) {
		console.error(`[PUT] Invalid data for id: ${ingdtId}`, parsedData.error.issues);
		throw error(400, `Invalid data for id: ${ingdtId}`);
	}

	const stmt = d1.prepare(
		`INSERT OR REPLACE INTO ingredients (userid, mx_id, id, data)
			 VALUES (?, ?, ?, ?)`,
	);
	await stmt.bind(userId, mxId, ingdtId, JSON.stringify(parsedData.data)).run();
	return json({ ok: true });
};

// delete the ingredient with the given id
export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	const mxId = params.mxId;
	const ingdtId = params.id;
	if (!mxId || !ingdtId) {
		throw error(400, 'Missing mxId or ingdtId');
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
		const stmt = d1.prepare('DELETE FROM ingredients WHERE userid = ? AND mx_id = ? AND id = ?');
		await stmt.bind(userId, mxId, ingdtId).run();
		return json({ ok: true });
	} catch (err: any) {
		console.error(`[DELETE] Error processing ingredient:`, err.message, err);
		throw error(500, `Failed to process DELETE: ${err.message}`);
	}
};
