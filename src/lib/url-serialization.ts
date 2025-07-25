import { Mixture } from '$lib/mixture.js';
import { compressSync } from 'fflate';
import * as fflate from 'fflate';
import {
	createFileDataV2,
	isV0Data,
	zUnifiedSerializationDataV2,
	type StoredFileDataV0,
	type UnifiedSerializationDataV2,
} from '$lib/data-format.js';
import { portV0DataToV1 } from '$lib/migrations/v0-v1.js';
import { v1ToV2, zFileDataV1 } from './data-format-v1.js';
import { generateStorageId } from './storage-id.js';

/**
 * Serializes a mixture into a compressed URL-safe string.
 */
export function serializeToUrl(name = 'mixture', mixture: Mixture): URL {
	const data: UnifiedSerializationDataV2 = {
		mx: createFileDataV2({ id: generateStorageId(), name, mixture, starred: false }),
		ingredients: mixture.serialize(),
	};
	const jsonString = JSON.stringify(data);
	const encoder = new TextEncoder();
	const buf = encoder.encode(jsonString);
	const compressed = compressSync(buf);
	const gz = btoa(String.fromCharCode(...compressed));

	const params = new URLSearchParams();
	params.set('gz', gz);

	const url = new URL(window.location.origin);
	url.pathname = encodeURIComponent(name);
	url.search = params.toString();

	return url;
}

/**
 * Deserializes a mixture from a URL-safe string.
 */
export function deserializeFromUrl(
	qs: string | URLSearchParams,
	name = '',
): {
	name: string;
	mixture: Mixture;
} {
	const params = typeof qs === 'string' ? new URLSearchParams(qs) : qs;
	name = name || params.get('name') || '';
	const { mx, ingredients } = decompress(params, name);
	const mixture = Mixture.deserialize(mx.rootIngredientId, ingredients);
	return { name, mixture };
}

/**
 * Decompresses a gz parameter from a URL into a mixture.
 */
export function decompress(qs: URLSearchParams, name: string) {
	const gz = qs.get('gz');
	if (!gz) {
		throw new Error('No compressed data found');
	}
	const compressedBytes = Uint8Array.from(atob(gz), (c) => c.charCodeAt(0));
	const buf = fflate.decompressSync(compressedBytes);
	const decoder = new TextDecoder();
	const jsonString = decoder.decode(buf);
	const data = JSON.parse(jsonString);
	return deserialize(data);
}

export function deserialize(data: unknown): UnifiedSerializationDataV2 {
	const parsed = zUnifiedSerializationDataV2.safeParse(data);
	if (parsed.success) {
		return parsed.data;
	}
	const v1 = zFileDataV1.safeParse(data);
	if (v1.success) {
		const v2Data = v1ToV2(v1.data);
		return {
			mx: v2Data.mx,
			ingredients: v2Data.ingredients,
		};
	}

	if (typeof data === 'object' && data !== null && 'ingredientDb' in data) {
		try {
			const db = (data as any).ingredientDb.map(([id, x]: [string, any]) => [
				id,
				'ingredients' in x ? { ingredients: x.ingredients } : x,
			]);
			const v1 = zFileDataV1.safeParse({ ...data, ingredientDb: db });
			if (v1.success) {
				const v2Data = v1ToV2(v1.data);
				return {
					mx: v2Data.mx,
					ingredients: v2Data.ingredients,
				};
			}
		} catch (_ignore) {}
	}

	if (isV0Data(data)) {
		const v1Data = portV0DataToV1(data);
		const v2Data = v1ToV2(v1Data);
		return {
			mx: v2Data.mx,
			ingredients: v2Data.ingredients,
		};
	}
	if (isV0Data({ mixture: { data } })) {
		const v1Data = portV0DataToV1({ mixture: { data } } as StoredFileDataV0);
		const v2Data = v1ToV2(v1Data);
		return {
			mx: v2Data.mx,
			ingredients: v2Data.ingredients,
		};
	}
	// If the data is in an unknown format, throw an error
	throw new Error('Invalid data format');
}
