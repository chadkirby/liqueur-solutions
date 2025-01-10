import { Mixture } from './mixture.js';
import { strToU8, strFromU8, compressSync } from 'fflate';

/**
 * Serializes a mixture into a compressed URL-safe string.
 */
export function serializeToUrl(name: string, mixture: Mixture): string {
	const buf = strToU8(JSON.stringify(mixture.serialize()), true);
	const compressed = compressSync(buf);
	const gz = btoa(strFromU8(compressed, true));

	const params = new URLSearchParams();
	params.set('gz', gz);
	if (name) {
		params.set('name', name);
	}
	return params.toString();
}
