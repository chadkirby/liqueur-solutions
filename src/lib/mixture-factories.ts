import { componentId, isWater, Mixture } from './index.svelte.js';
import { calculateAbvProportions } from './ingredients/density.js';
import { SubstanceComponent } from './ingredients/substance-component.js';
import type { CitrusJuiceId, CitrusJuiceName } from './citrus-ids.js';
import { isClose, seek } from './solver.js';

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

export function newPreservative(volume: number): Mixture {
	const mx = new Mixture(componentId(), 1, [
		{
			name: 'sodium benzoate',
			proportion: 15,
			component: SubstanceComponent.new('sodium-benzoate'),
		},
		{
			name: 'potassium sorbate',
			proportion: 25,
			component: SubstanceComponent.new('potassium-sorbate'),
		},
		{
			name: 'water',
			proportion: 100,
			component: SubstanceComponent.new('water'),
		},
	]).setVolume(volume);
	return mx;
}

export function newZeroSyrup(volume: number, desiredBrix = 66.67): Mixture {
	const preservative = newPreservative(100);
	const mx = new Mixture()
		.addIngredient({
			name: 'sucralose',
			mass: 1,
			component: SubstanceComponent.new('sucralose'),
		})
		.addIngredient({
			name: 'allulose',
			mass: 250,
			component: SubstanceComponent.new('allulose'),
		})
		.addIngredient({
			name: 'preservative',
			mass: preservative.mass / 100,
			component: preservative,
		})
		.addIngredient({
			name: 'buffer acid',
			mass: 1.3,
			component: SubstanceComponent.new('citric-acid'),
		})
		.addIngredient({
			name: 'buffer base',
			mass: 1,
			component: SubstanceComponent.new('sodium-citrate'),
		})
		.addIngredient({
			name: 'water',
			// add water to make up the volume to 1000
			mass: 890.7899,
			component: SubstanceComponent.new('water'),
		});

	// we need to adjust the sweetness to the desired brix
	// it's too hard to measure tiny quantities of sucralose, so we'll
	// adjust the sweetness by adjusting the allulose mass
	const allulose = mx.findIngredient(
		(i) => i instanceof SubstanceComponent && i.substanceId === 'allulose',
	);
	if (!allulose) throw new Error('Allulose not found');
	// we'll also need to adjust the water mass to keep the volume at 1000
	// while we're adjusting proportions to hit the desired sweetness
	const water = mx.findIngredient(isWater);
	if (!water) throw new Error('Water not found');

	seek(mx, {
		message: 'Adjusting allulose mass to desired brix',
		throwOnFail: true,
		maxIterations: 100,
		predicate: (mx) => isClose(mx.brix, desiredBrix, 0.01),
		adjuster: (mx) => {
			const actualBrix = mx.brix;
			mx.scaleIngredientMass(allulose.id, desiredBrix / actualBrix);
			// while we're dialing in the sweetnedd, keep the volume to 1000
			const desiredVolume = 1000;
			seek(mx, {
				message: 'Adjusting water mass to restore volume',
				maxIterations: 10,
				predicate: (mx) => isClose(mx.volume, desiredVolume, 0.01),
				adjuster: (mx) => mx.scaleIngredientMass(water.id, desiredVolume / mx.volume),
			});
			return mx;
		},
	});

	// now that the ingredient proportions are correct, set the volume
	mx.setVolume(volume);
	return mx;
}
