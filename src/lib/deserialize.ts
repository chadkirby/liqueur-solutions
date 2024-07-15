import queryString from 'query-string';
import { type AnyData } from './component.js';
import { dataToMixture } from './mixture.js';

export function deserialize(qs: string | URLSearchParams) {
	const params = typeof qs === 'string' ? new URLSearchParams(qs) : qs;
	const data = queryString.parse(params.toString(), { arrayFormat: 'index', sort: false });
	const liqueur = data.liqueur ?? 'mixture';
	if (!('components' in data) || !(typeof data.components === 'object')) {
		throw new Error('No components found' + params.toString());
	}
	const components = Array.from(Object.values(data.components as string[]), (x) =>
		JSON.parse(x)
	) as unknown as Array<{
		name: string;
		id: string;
		data: AnyData;
	}>;
	const mx = dataToMixture({ components });
	return { liqueur, components: mx.rawData.components };
}
