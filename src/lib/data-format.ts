import { isSubstanceId } from './ingredients/substances.js';
import { zIngredientMeta } from './mixture-types.js';
import { SimpleHash } from './simple-hash.js';
import { z } from 'zod/v4-mini';

export const currentDataVersion = 1;

const zMixtureData = z.object({
	id: z.string(),
	// ids, and other data for this sub-mixture's ingredients
	ingredients: z.array(zIngredientMeta),
});
export type MixtureData = z.infer<typeof zMixtureData>;

export const isMixtureItem = (item: unknown): item is MixtureData => {
	return zMixtureData.safeParse(item).success;
};

const zSubstanceData = z.object({
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

// prettier-ignore
const zIngredientDbEntry = z.tuple([
	z.string(),
	z.union([zMixtureData, zSubstanceData])
]);
export type IngredientDbEntry = z.infer<typeof zIngredientDbEntry>;

export const zFileDataV1 = z.strictObject({
	version: z.literal(currentDataVersion),
	id: z.string(),
	name: z.string(),
	accessTime: z.iso.datetime(), // ISO date string
	desc: z.string(), // denormalized mixture.describe() string
	rootMixtureId: z.string(), // pointer to the root mixture in the ingredientDb
	ingredientDb: z.array(zIngredientDbEntry),
	_ingredientHash: z.string(),
});

export type FileDataV1 = z.infer<typeof zFileDataV1>;

export const zFileSync = z.strictObject({
	id: z.string(), // storage ID of the file
	lastSyncTime: z.string(), // last successful sync time
	lastSyncHash: z.string(), // hash of the file contents at last sync
});

export type FileSyncMeta = z.infer<typeof zFileSync>;

export function getIngredientHash(
	item: Pick<FileDataV1, 'name' | 'desc' | 'ingredientDb'>,
): string {
	const h = new SimpleHash().update(item.name).update(item.desc);
	for (const [_, ingredient] of item.ingredientDb) {
		if ('ingredients' in ingredient) {
			for (const item of ingredient.ingredients) {
				h.update(item.name)
					.update(item.mass.toString())
					.update(item.notes || '');
				if (isSubstanceId(item.id)) h.update(item.id);
			}
		}
	}
	return h.toString();
}

export function isV1Data(data: unknown): data is FileDataV1 {
	return zFileDataV1.safeParse(data).success;
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
