import * as fflate from 'fflate';
import { Mixture } from '$lib/mixture.js';
import { isV0Data, isV1Data, type StoredFileDataV1 } from '$lib/data-format.js';
import { portV0DataToV1 } from '$lib/migrations/v0-v1.js';

/**
 * Decompresses a gz parameter from a URL into a mixture.
 */
function decompress(qs: URLSearchParams, name: string): Mixture {
	const gz = qs.get('gz');
	if (!gz) {
		throw new Error('No compressed data found');
	}
	const buf = fflate.decompressSync(fflate.strToU8(atob(gz), true));
	const data = JSON.parse(fflate.strFromU8(buf, true));
	const v1Data: StoredFileDataV1 | null = isV1Data(data)
		? data
		: isV0Data({ mixture: { name, data } })
			? portV0DataToV1({ mixture: { name, data }, desc: '' })
			: null;
	if (!v1Data) {
		throw new Error('Unknown data format' + qs.toString());
	}
	return Mixture.deserialize(v1Data.rootMixtureId, v1Data.ingredientDb);
}

/**
 * Deserializes a mixture from a URL-safe string.
 */
export function deserializeFromUrl(qs: string | URLSearchParams): {
	name: string;
	mixture: Mixture;
} {
	const params = typeof qs === 'string' ? new URLSearchParams(qs) : qs;
	const name = params.get('name') || '';
	const mixture = decompress(params, name);
	return { name, mixture };
}
