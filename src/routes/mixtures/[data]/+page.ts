import { Mixture } from '$lib/solutions.js';

export function load({ params }: { params: { data: string } }) {
	try {
		const mixture = Mixture.deserialize(params.data);
		return Object.fromEntries([...mixture].map(([key, { data }]) => [key, data]));
	} catch (err) {
		return {
			spirit: { volume: 100, abv: 40, type: 'spirit' },
			water: { volume: 100, type: 'water' },
			sugar: { mass: 50, type: 'sugar' }
		};
	}
}
