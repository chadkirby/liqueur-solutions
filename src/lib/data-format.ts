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
	return (
		isObj(data) &&
		'mixture' in data &&
		isObj(data.mixture) &&
		'data' in data.mixture &&
		isObj(data.mixture.data) &&
		'type' in data.mixture.data &&
		data.mixture.data.type === 'mixture' &&
		'components' in data.mixture.data &&
		Array.isArray(data.mixture.data.components)
	);
}

function isObj(obj: unknown): obj is Record<string, unknown> {
	return typeof obj === 'object' && obj !== null;
}
