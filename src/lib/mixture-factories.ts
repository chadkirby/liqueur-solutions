import { componentId, Mixture } from './index.svelte.js';
import { calculateAbvProportions } from './ingredients/density.js';
import { SubstanceComponent } from './ingredients/substance-component.js';
import type { CitrusJuiceId, CitrusJuiceName } from './citrus-ids.js';

export type IdPrefix = `(${string})`;
export type PrefixedId = `${IdPrefix}${string}`;

export function newSpirit(vol = 100, abv = 40): Mixture {
	const props = calculateAbvProportions(abv, 100);
	const mx = new Mixture(componentId(), 0, [
		{
			name: 'ethanol',
			mass: props.ethanolMass,
			component: SubstanceComponent.new('ethanol'),
		},
		{
			name: 'water',
			mass: props.waterMass,
			component: SubstanceComponent.new('water'),
		},
	]).setVolume(vol);

	return mx;
}

export function newSyrup(volume: number, brix: number): Mixture {
	const mx = new Mixture(componentId(), 1, [
		{
			name: 'sugar',
			proportion: brix / 100,
			component: SubstanceComponent.new('sucrose'),
		},
		{
			name: 'water',
			proportion: 1 - brix / 100,
			component: SubstanceComponent.new('water'),
		},
	]).setVolume(volume);
	return mx;
}

export const citrus = {
	lemon(volume: number): Mixture {
		// Lemon juice (~100ml):
		// Water: ~89-90ml
		// Citric acid: ~5-6g (primary acid)
		// Malic acid: ~0.2-0.3g
		// Sugars: ~2.5g (mix of fructose/glucose)
		const mx = new Mixture(`(citrus-lemon)${componentId()}` satisfies CitrusJuiceId, 100, [
			{
				name: 'water',
				proportion: 90,
				component: SubstanceComponent.new('water'),
			},
			{
				name: 'citric acid',
				proportion: 5.8,
				component: SubstanceComponent.new('citric-acid'),
			},
			{
				name: 'malic acid',
				proportion: 0.2,
				component: SubstanceComponent.new('malic-acid'),
			},
			{
				name: 'sugar',
				proportion: 1.25,
				component: SubstanceComponent.new('fructose'),
			},
			{
				name: 'sugar',
				proportion: 1.25,
				component: SubstanceComponent.new('glucose'),
			},
		]).setVolume(volume);
		return mx;
	},

	// Sugars: ~1.5g
	lime(volume: number): Mixture {
		// Lime juice (~100ml):
		// Water: ~90-91ml
		// Citric acid: ~5-6g (similar to lemon)
		// Malic acid: ~0.1-0.2g
		const mx = new Mixture(`(citrus-lime)${componentId()}` satisfies CitrusJuiceId, 100, [
			{
				name: 'water',
				proportion: 90,
				component: SubstanceComponent.new('water'),
			},
			{
				name: 'citric acid',
				proportion: 5.8,
				component: SubstanceComponent.new('citric-acid'),
			},
			{
				name: 'malic acid',
				proportion: 0.2,
				component: SubstanceComponent.new('malic-acid'),
			},
			{
				name: 'sugar',
				proportion: 0.75,
				component: SubstanceComponent.new('fructose'),
			},
			{
				name: 'sugar',
				proportion: 0.75,
				component: SubstanceComponent.new('glucose'),
			},
		]).setVolume(volume);
		return mx;
	},

	orange(volume: number): Mixture {
		// Orange juice (~100ml):
		// Water: ~87-88ml
		// Citric acid: ~1-1.2g
		// Malic acid: ~0.1-0.2g
		// Sugars: ~9-10g
		const mx = new Mixture(`(citrus-orange)${componentId()}` satisfies CitrusJuiceId, 100, [
			{
				name: 'water',
				proportion: 88,
				component: SubstanceComponent.new('water'),
			},
			{
				name: 'citric acid',
				proportion: 1.2,
				component: SubstanceComponent.new('citric-acid'),
			},
			{
				name: 'malic acid',
				proportion: 0.2,
				component: SubstanceComponent.new('malic-acid'),
			},
			{
				name: 'sugar',
				proportion: 5,
				component: SubstanceComponent.new('fructose'),
			},
			{
				name: 'sugar',
				proportion: 5,
				component: SubstanceComponent.new('glucose'),
			},
		]).setVolume(volume);
		return mx;
	},

	grapefruit(volume: number): Mixture {
		// Grapefruit juice (~100ml):
		// Water: ~90-91ml
		// Citric acid: ~1.2-1.5g
		// Malic acid: ~0.3-0.4g
		// Sugars: ~7-8g
		const mx = new Mixture(`(citrus-grapefruit)${componentId()}` satisfies CitrusJuiceId, 100, [
			{
				name: 'water',
				proportion: 90,
				component: SubstanceComponent.new('water'),
			},
			{
				name: 'citric acid',
				proportion: 1.2,
				component: SubstanceComponent.new('citric-acid'),
			},
			{
				name: 'malic acid',
				proportion: 0.3,
				component: SubstanceComponent.new('malic-acid'),
			},
			{
				name: 'sugar',
				proportion: 3.5,
				component: SubstanceComponent.new('fructose'),
			},
			{
				name: 'sugar',
				proportion: 3.5,
				component: SubstanceComponent.new('glucose'),
			},
		]).setVolume(volume);
		return mx;
	},
} as const satisfies Record<CitrusJuiceName, (volume: number) => Mixture>;
