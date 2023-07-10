import { Mixture, Spirit, Water, Sugar } from '$lib';
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export function load() {
	/** @type {{name: string, component: import('$lib').Component}[]} */
	const components = [
		{ name: 'spirit', component: new Spirit(100, 40) },
		{ name: 'water', component: new Water(100) },
		{ name: 'sugar', component: new Sugar(50) }
	];
	const mixture = new Mixture(components);

	throw redirect(307, `/${encodeURIComponent('My Mixture')}?${mixture.serialize()}`);
}
