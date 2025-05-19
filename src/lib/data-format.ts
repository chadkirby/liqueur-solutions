import { isSubstanceIid } from './ingredients/substances.js';
import { isMixtureData, type IngredientData } from './mixture-types.js';
import { SimpleHash } from './simple-hash.js';

export const currentDataVersion = 1;

/**
 * FileItem represents a stored mixture file. All types must be
 * compatible with Replicache's ReadonlyJSONValue.
 */
export type StoredFileDataV1 = {
	version: typeof currentDataVersion;
	id: string;
	name: string;
	accessTime: number;
	desc: string;
	rootMixtureId: string;
	ingredientDb: IngredientDbData;
};

export function getIngredientHash(
	item: Pick<StoredFileDataV1, 'name' | 'desc' | 'ingredientDb'>,
): string {
	const h = new SimpleHash().update(item.name).update(item.desc);
	for (const [_, ing] of item.ingredientDb) {
		if (isMixtureData(ing)) {
			for (const { id, name, mass, notes } of ing.ingredients) {
				h.update(name)
					.update(mass.toString())
					.update(notes || '');
				if (isSubstanceIid(id)) h.update(id);
			}
		} else {
			h.update(ing.id);
		}
	}
	return h.toString();
}

// serialized Map<string, IngredientData>
export type IngredientDbData = Array<[string, IngredientData]>;

export function isV1Data(data: unknown): data is StoredFileDataV1 {
	if (typeof data !== 'object' || data === null) {
		return false;
	}
	return 'version' in data && data.version === 1;
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
