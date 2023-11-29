import { Mixture, Spirit, Water, Sugar } from '$lib';
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export function load() {
    /** @type {{
     * name: string,
     * component: import('$lib').Spirit | import('$lib').Water | import('$lib').Sugar
     * }[] } */
    const components = [
        { name: 'spirit', component: new Spirit(100, 40, 'none') },
        { name: 'water', component: new Water(100, 'none') },
        { name: 'sugar', component: new Sugar(50, 'none') }
    ];
    const mixture = new Mixture(components);

    throw redirect(307, `/${encodeURIComponent('My Mixture')}?${mixture.serialize()}`);
}
