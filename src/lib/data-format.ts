import { isSubstanceIid } from './ingredients/substances.js';
import { isMixtureData, type IngredientData } from './mixture-types.js';
import { SimpleHash } from './simple-hash.js';
import type { StorageId } from './storage-id.js';
import type { CellSchema } from 'tinybase';

export const currentDataVersion = 1;

// Base type from schema (includes all fields including sync fields)
export type DeserializedFileDataV1 = {
	readonly version: 1;
	readonly id: StorageId;
	readonly name: string;
	readonly accessTime: number;
	readonly desc: string;
	readonly rootMixtureId: string;
	readonly ingredientDb: IngredientDbData;
	readonly _ingredientHash: string;
};

export type SerializedFileDataV1 = Omit<DeserializedFileDataV1, 'ingredientDb'> & {
	readonly ingredientJSON: string;
};

// Type to map TypeScript types to schema types
type TypeToSchemaType<T> = T extends string
	? 'string'
	: T extends number
		? 'number'
		: T extends boolean
			? 'boolean'
			: never;

// Type to ensure schema matches our data type
type SchemaForType<T> = {
	[K in keyof T]: {
		type: TypeToSchemaType<T[K]>;
		default?: T[K];
	};
};

/**
 * The schema for the file data as stored in the database.
 */
export const fileSchemaV1 = {
	version: { type: 'number', default: currentDataVersion },
	id: { type: 'string' },
	name: { type: 'string' },
	accessTime: { type: 'number' },
	desc: { type: 'string' },
	rootMixtureId: { type: 'string' },
	ingredientJSON: { type: 'string' }, // serialized Map<string, IngredientData>
	_ingredientHash: { type: 'string' }, // hash of the local file contents
} as const satisfies Record<string, CellSchema> satisfies SchemaForType<SerializedFileDataV1>;

export type FileSyncMeta = {
	readonly lastSyncTime: number;
	readonly lastSyncHash: string;
};

export const fileSyncSchema = {
	lastSyncTime: { type: 'number', default: 0 }, // last successful sync time
	lastSyncHash: { type: 'string', default: '' }, // hash of the file contents at last sync
} as const satisfies Record<string, CellSchema> satisfies SchemaForType<FileSyncMeta>;

export function getIngredientHash(
	item: Pick<DeserializedFileDataV1, 'name' | 'desc' | 'ingredientDb'>,
): string {
	const h = new SimpleHash().update(item.name).update(item.desc);
	for (const [_, ingredient] of item.ingredientDb) {
		if (isMixtureData(ingredient)) {
			for (const { id, name, mass, notes } of ingredient.ingredients) {
				h.update(name)
					.update(mass.toString())
					.update(notes || '');
				if (isSubstanceIid(id)) h.update(id);
			}
		} else {
			h.update(ingredient.id);
		}
	}
	return h.toString();
}

// serialized Map<string, IngredientData>
export type IngredientDbData = Array<[string, IngredientData]>;

export function isV1Data(data: unknown): data is DeserializedFileDataV1 {
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
