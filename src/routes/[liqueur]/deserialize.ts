import * as fflate from 'fflate';
import { dataToMixture, type Mixture } from '$lib/mixture.js';
import type { AnyData } from '$lib/components/index.js';

/**
 * Decompresses a gz parameter from a URL into a mixture.
 */
export function decompress(qs: URLSearchParams): Mixture {
	const gz = qs.get('gz');
	if (!gz) {
		throw new Error('No compressed data found');
	}
	const buf = fflate.decompressSync(fflate.strToU8(atob(gz), true));
	const data = JSON.parse(fflate.strFromU8(buf, true));
	if (!('components' in data) || !(typeof data.components === 'object')) {
		throw new Error('No components found' + qs.toString());
	}
	const components = Array.from(Object.values(data.components as string[])) as unknown as Array<{
		name: string;
		id: string;
		data: AnyData;
	}>;
	return dataToMixture({ type: 'mixture', components });
}

/**
 * Deserializes a mixture from a URL-safe string.
 */
export function deserializeFromUrl(qs: string | URLSearchParams): {
	name: string;
	mixture: Mixture;
} {
	const params = typeof qs === 'string' ? new URLSearchParams(qs) : qs;
	const mixture = decompress(params);
	const name = params.get('name') || '';
	return { name, mixture };
}
