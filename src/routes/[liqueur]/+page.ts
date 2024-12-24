import type { LoadDataFromUrl } from '$lib/load-data.js';
import { deserializeFromUrl } from '$lib/url-serialization.js';

export function load(args: { url: URL; params: { liqueur: string } }): LoadDataFromUrl {
	const { url, params } = args;
	try {
		const { name, mixture } = deserializeFromUrl(url.searchParams);
		if (!mixture.isValid) throw new Error('Invalid mixture');

		return {
			storeId: null,
			name: name || decodeURIComponent(params.liqueur) || 'mixture',
			components: mixture.data.components
		};
	} catch (err) {
		console.error(err);
		return {
			storeId: null,
			name: '',
			components: []
		};
	}
}
