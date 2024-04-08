import { Mixture, Spirit, Water, Sugar } from '$lib';
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export function load() {
    /** @type {{
     * name: string,
    * id: string,
     * component: import('$lib').Spirit | import('$lib').Water | import('$lib').Sugar
     * }[] } */
    const components = [
        { name: 'spirit', id: 'spirit', component: new Spirit(100, 40) },
        { name: 'water', id: 'water', component: new Water(100) },
        { name: 'sugar', id: 'sugar', component: new Sugar(50) }
    ];
    const mixture = new Mixture(components);

    throw redirect(307, `/${encodeURIComponent('My Mixture')}?${mixture.serialize()}`);
}
