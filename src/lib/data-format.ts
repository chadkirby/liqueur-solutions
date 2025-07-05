import { isSubstanceId } from './ingredients/substances.js';
import { zIngredientMeta } from './mixture-types.js';
import type { Mixture } from './mixture.js';
import { SimpleHash } from './simple-hash.js';
import { z } from 'zod/v4-mini';

export const currentDataVersion = 2;

export const zMixtureList = z.object({
	ingredientHash: z.string(),
	name: z.string(),
	id: z.string(),
	desc: z.string(),
	accessTime: z.iso.datetime(), // ISO date string
});

export const zMixtureData = z.object({
	id: z.string(),
	// ids, and other data for this sub-mixture's ingredients
	ingredients: z.array(zIngredientMeta),
});
export type MixtureData = z.infer<typeof zMixtureData>;

export const isMixtureItem = (item: unknown): item is MixtureData => {
	return zMixtureData.safeParse(item).success;
};

export const zSubstanceData = z.object({
	id: z.string().check(
		z.refine(isSubstanceId, {
			message: 'Invalid substance ID',
		}),
	),
});

export type SubstanceData = z.infer<typeof zSubstanceData>;

export type IngredientData = MixtureData | SubstanceData;

export function isMixtureData(data: IngredientData): data is MixtureData {
	return zMixtureData.safeParse(data).success;
}

export function isSubstanceData(data: IngredientData): data is SubstanceData {
	return zSubstanceData.safeParse(data).success;
}

export type SubstanceItem = z.infer<typeof zSubstanceData>;

export const isSubstanceItem = (item: unknown): item is z.infer<typeof zSubstanceData> => {
	return zSubstanceData.safeParse(item).success;
};

export const zIngredientItem = z.union([zMixtureData, zSubstanceData]);
export type IngredientItemData = z.infer<typeof zIngredientItem>;

export const zFileDataV2 = z.strictObject({
	version: z.literal(currentDataVersion),
	id: z.string(),
	name: z.string(),
	accessTime: z.iso.datetime(), // ISO date string
	desc: z.string(), // denormalized mixture.describe() string
	rootIngredientId: z.string(), // pointer to the root mixture in the ingredientDb
	_ingredientHash: z.string(),
});

// for writing to a single file/json object
export const zUnifiedSerializationDataV2 = z.object({
	mx: zFileDataV2,
	ingredients: z.array(zIngredientItem),
});

export type UnifiedSerializationDataV2 = z.infer<typeof zUnifiedSerializationDataV2>;

export function createFileDataV2(item: { id: string; name: string; mixture: Mixture }): FileDataV2 {
	const accessTime = new Date().toISOString();
	const desc = item.mixture.describe();
	const ingredients = item.mixture.serialize();
	return {
		version: currentDataVersion,
		id: item.id,
		name: item.name,
		accessTime,
		desc,
		rootIngredientId: item.mixture.id,
		_ingredientHash: getIngredientHash({ name: item.name, desc }, ingredients),
	} as const;
}

export type FileDataV2 = z.infer<typeof zFileDataV2>;

export function getIngredientHash(
	item: Pick<FileDataV2, 'name' | 'desc'>,
	ingredients: IngredientItemData[],
): string {
	const h = new SimpleHash().update(item.name).update(item.desc);
	for (const ingredient of ingredients) {
		if ('ingredients' in ingredient) {
			for (const item of ingredient.ingredients) {
				h.update(item.name)
					.update(item.mass.toString())
				if (isSubstanceId(item.id)) h.update(item.id);
			}
		}
	}
	return h.toString();
}

export interface V0MixtureData {
	readonly type: 'ethanol' | 'water' | 'sweetener' | 'mixture';
	volume: number;
	subType?: 'sucrose' | 'fructose' | 'allulose' | 'erythritol' | 'sucralose';
	mass?: number;
	components?: Array<{ name: string; id: string; data: V0MixtureData }>;
}

export type StoredFileDataV0 = {
	id: string;
	name: string;
	accessTime: number;
	desc: string;
	mixture: { name: string; data: V0MixtureData };
};

export function isV0Data(data: unknown): data is StoredFileDataV0 {
	if (!isObj(data)) return false;
	if (!('mixture' in data)) return false;

	const mixture = data.mixture;
	if (!isObj(mixture)) return false;
	if (!('data' in mixture)) return false;

	const mixtureData = mixture.data;
	if (!isObj(mixtureData)) return false;
	if (!('type' in mixtureData)) return false;
	if (mixtureData.type !== 'mixture') return false;
	if (!('components' in mixtureData)) return false;

	return Array.isArray(mixtureData.components);
}

function isObj(obj: unknown): obj is Record<string, unknown> {
	return typeof obj === 'object' && obj !== null;
}
