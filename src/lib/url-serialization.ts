import { Mixture } from './mixture.js';
import * as fflate from 'fflate';
import { type AnyData } from './components/index.js';
import { dataToMixture } from './mixture.js';

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
    return dataToMixture({ components });
}

/**
 * Serializes a mixture into a compressed URL-safe string.
 */
export function serializeToUrl(name: string, mixture: Mixture): string {
    const gz = mixture.serializeGz();
    const params = new URLSearchParams();
    params.set('gz', gz);
    if (name) {
        params.set('name', name);
    }
    return params.toString();
}

/**
 * Deserializes a mixture from a URL-safe string.
 */
export function deserializeFromUrl(qs: string | URLSearchParams): { name: string; mixture: Mixture } {
    const params = typeof qs === 'string' ? new URLSearchParams(qs) : qs;
    const mixture = decompress(params);
    const name = params.get('name') || '';
    return { name, mixture };
}
