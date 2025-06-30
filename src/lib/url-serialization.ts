import { Mixture } from '$lib/mixture.js';
import { strToU8, strFromU8, compressSync } from 'fflate';
import * as fflate from 'fflate';
import { isV0Data, type FileDataV1 } from '$lib/data-format.js';
import { portV0DataToV1 } from '$lib/migrations/v0-v1.js';

/**
 * Serializes a mixture into a compressed URL-safe string.
 */
export function serializeToUrl(
	name = 'mixture',
	mixture: Mixture,
	pathname: '/view' | '/edit' = '/view',
): URL {
	const ingredientDb = mixture.serialize();
	const rootMixtureId = ingredientDb[0][0];
	const buf = strToU8(JSON.stringify({ rootMixtureId, ingredientDb }), true);
	const compressed = compressSync(buf);
	const gz = btoa(strFromU8(compressed, true));

	const params = new URLSearchParams();
	params.set('gz', gz);
	if (name) {
		params.set('name', name);
	}

	const url = new URL(window.location.origin);
	url.pathname = pathname;
	url.search = params.toString();

	return url;
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
	const v1Data: FileDataV1 = isV0Data({ mixture: { name, data } })
		? portV0DataToV1({ mixture: { name, data }, desc: '' })
		: data;
	if (!v1Data) {
		throw new Error('Unknown data format' + qs.toString());
	}
	return Mixture.deserialize(v1Data.rootMixtureId, v1Data.ingredientDb);
}
