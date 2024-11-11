import * as fflate from 'fflate';
import { type AnyData } from './component.js';
import { dataToMixture } from './mixture.js';

export function deserialize(qs: string | URLSearchParams) {
	const params = typeof qs === 'string' ? new URLSearchParams(qs) : qs;
	const gz = params.get('gz');
	if (!gz) {
		throw new Error('No compressed data found');
	}
	const buf = fflate.decompressSync(fflate.strToU8(atob(gz), true));
	const data = JSON.parse(fflate.strFromU8(buf, true));
	const liqueur = data.liqueur ?? 'mixture';
	if (!('components' in data) || !(typeof data.components === 'object')) {
		throw new Error('No components found' + params.toString());
	}
	const components = Array.from(Object.values(data.components as string[])) as unknown as Array<{
		name: string;
		id: string;
		data: AnyData;
	}>;
	const mx = dataToMixture({ components });
	return { liqueur, components: mx.rawData.components };
}
