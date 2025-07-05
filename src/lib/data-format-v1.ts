import { z } from 'zod/v4-mini';
import {
	isSubstanceItem,
	zMixtureData,
	zSubstanceData,
	type FileDataV2,
	type IngredientItemData,
	type MixtureData,
	type SubstanceData,
} from './data-format.js';

// prettier-ignore
const zIngredientDbEntry = z.tuple([
	z.string(),
	z.union([zMixtureData, zSubstanceData])
]);
export type IngredientDbEntry = z.infer<typeof zIngredientDbEntry>;

export const zFileDataV1 = z.strictObject({
	version: z.literal(1),
	id: z.string(),
	name: z.string(),
	accessTime: z.iso.datetime(), // ISO date string
	desc: z.string(), // denormalized mixture.describe() string
	rootMixtureId: z.string(), // pointer to the root mixture in the ingredientDb
	ingredientDb: z.array(zIngredientDbEntry),
	_ingredientHash: z.string(),
});

export type FileDataV1 = z.infer<typeof zFileDataV1>;

export function v1ToV2(data: FileDataV1): { mx: FileDataV2; ingredients: IngredientItemData[] } {
	const { ingredientDb, rootMixtureId, ...rest } = data;
	const mx: FileDataV2 = {
		...rest,
		rootIngredientId: rootMixtureId,
		version: 2,
	};
	const ingredients: IngredientItemData[] = ingredientDb.map(([id, item]) => {
		if (isSubstanceItem(item)) {
			return { id, item: item as SubstanceData };
		}
		return { id, item: item as MixtureData };
	});
	return { mx, ingredients };
}

