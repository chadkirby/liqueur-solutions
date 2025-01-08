import type { IngredientDbData, MixtureData } from './mixture-types.js';

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

export function isV1Data(data: unknown): boolean {
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
