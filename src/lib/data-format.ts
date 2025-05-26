import { isSubstanceIid } from './ingredients/substances.js';
import { isMixtureData, type IngredientData } from './mixture-types.js';
import { SimpleHash } from './simple-hash.js';
import type { StorageId } from './storage-id.js';
import { z } from 'zod';

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

export const zodIngredientDbItemSchema = z.record(
	z.union([
		z.object({
			type: z.literal('mixture'),
			ingredients: z.array(
				z.object({
					id: z.string(),
					name: z.string(),
					mass: z.number(),
					notes: z.string().optional(),
				}),
			),
		}),
		z.object({
			type: z.literal('substance'),
			id: z.string(),
			name: z.string(),
			mass: z.number(),
			notes: z.string().optional(),
		}),
	]),
);

export const fileSchemaV1 = z
	.object({
		version: z.literal(currentDataVersion),
		id: z.string(),
		name: z.string(),
		accessTime: z.number(),
		desc: z.string(),
		rootMixtureId: z.string(),
		ingredientJSON: z.string(), // serialized Map<string, IngredientData>
		_ingredientHash: z.string(),
	})
	.strict();

export type SerializedFileDataV1 = z.infer<typeof fileSchemaV1>;

export const fileSyncSchema = z
	.object({
		id: z.string(), // storage ID of the file
		lastSyncTime: z.number().default(0), // last successful sync time
		lastSyncHash: z.string().default(''), // hash of the file contents at last sync
	})
	.strict();

export type FileSyncMeta = z.infer<typeof fileSyncSchema>;

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

export type IngredientDbData = ReadonlyArray<[StorageId, IngredientData]>;

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
