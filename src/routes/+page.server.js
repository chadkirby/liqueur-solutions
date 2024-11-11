import { Mixture, Water, Sweetener, newSpirit } from '$lib';
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export function load() {
    /** @type {{
     * name: string,
    * id: string,
    * component: import ('$lib').Mixture | import ('$lib').Water | import ('$lib').Sweetener
     * }[] } */
    const components = [
        { name: 'spirit', id: 'spirit', component: newSpirit(100, 40) },
        { name: 'water', id: 'water', component: new Water(100) },
        { name: 'sugar', id: 'sweetener', component: new Sweetener('sucrose', 50) }
    ];
    const mixture = new Mixture(components);

    throw redirect(307, `/${encodeURIComponent('My Mixture')}?gz=${mixture.serialize()}`);
}
