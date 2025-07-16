import { error } from '@sveltejs/kit';
import {
	zFileDataV2,
	zIngredientItem,
	type IngredientData,
	type IngredientItemData,
} from '$lib/data-format.js';
import type { D1Database } from './cf-bindings.js';

export async function getIngredient(
	db: D1Database,
	spec: { userId: string; mxId: string; ingdtId: string },
) {
	const { userId, mxId, ingdtId } = spec;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}
	const stmt = db.prepare('SELECT data FROM ingredients WHERE userid = ? AND mx_id = ? AND id = ?');
	const result = await stmt.bind(userId, mxId, ingdtId).first();
	if (!result) {
		throw error(404, { message: `Ingredient not found for id: ${ingdtId}` });
	}
	return zIngredientItem.safeParse(JSON.parse(result.data as string));
}

export async function getMixture(db: D1Database, spec: { userId: string; mxId: string }) {
	const { userId, mxId } = spec;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}
	const stmt = db.prepare(`SELECT * FROM mixtures WHERE userid = ? AND id = ?`);
	const result = await stmt.bind(userId, mxId).first();
	if (!result) {
		throw error(404, { message: `Mixture not found for id: ${mxId}` });
	}
	// ensure starred is a boolean
	result.starred = Boolean(result.starred);
	// Remove userid field before validation since it's not part of the data model
	const { userid, ...dataWithoutUserId } = result;
	return zFileDataV2.safeParse(dataWithoutUserId);
}

export async function getAllIngredients(
	db: D1Database,
	spec: { userId: string; mxId: string },
): Promise<{ ingredients: IngredientItemData[]; errors: string[] }> {
	const { userId, mxId } = spec;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}
	const stmt = db.prepare('SELECT data FROM ingredients WHERE userid = ? AND mx_id = ?');
	const result = await stmt.bind(userId, mxId).all();

	const ingredients: IngredientItemData[] = [];
	const errors: string[] = [];
	for (const row of result.results) {
		const parsed = zIngredientItem.safeParse(JSON.parse(row.data as string));
		if (parsed.success) {
			ingredients.push(parsed.data);
		} else {
			const errString = `[Ingredients] Invalid data for mixture id: ${mxId}. Issues: ${parsed.error.issues
				.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
				.join(', ')}\n\nRow data: ${JSON.stringify(row)}`;
			errors.push(errString);
		}
	}
	return { ingredients, errors };
}
