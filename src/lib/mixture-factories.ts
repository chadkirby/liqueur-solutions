import { calculateAbvProportions } from './ingredients/density.js';
import { SubstanceComponent } from './ingredients/substance-component.js';
import type { CitrusJuiceId, CitrusJuiceName } from './citrus-ids.js';
import { isClose, seek } from './solver.js';
import { componentId, isWaterComponent, Mixture } from './mixture.js';

export type IdPrefix = `(${string})`;
export type PrefixedId = `${IdPrefix}${string}`;

export function newSpirit(vol = 100, abv = 40): Mixture {
	const props = calculateAbvProportions(abv, 100);
	const mx = new Mixture(componentId(), [
		{
			name: 'ethanol',
			mass: props.ethanolMass,
			item: SubstanceComponent.new('ethanol'),
		},
		{
			name: 'water',
			mass: props.waterMass,
			item: SubstanceComponent.new('water'),
		},
	]).setVolume(vol);

	return mx;
}

export function newSyrup(volume: number, brix: number): Mixture {
	const mx = new Mixture(componentId(), [
		{
			name: 'sugar',
			mass: brix / 100,
			item: SubstanceComponent.new('sucrose'),
		},
		{
			name: 'water',
			mass: 1 - brix / 100,
			item: SubstanceComponent.new('water'),
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
		const mx = new Mixture(`(citrus-lemon)${componentId()}` satisfies CitrusJuiceId, [
			{
				name: 'water',
				mass: 90,
				item: SubstanceComponent.new('water'),
			},
			{
				name: 'citric acid',
				mass: 5.8,
				item: SubstanceComponent.new('citric-acid'),
			},
			{
				name: 'malic acid',
				mass: 0.2,
				item: SubstanceComponent.new('malic-acid'),
			},
			{
				name: 'sugar',
				mass: 1.25,
				item: SubstanceComponent.new('fructose'),
			},
			{
				name: 'sugar',
				mass: 1.25,
				item: SubstanceComponent.new('glucose'),
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
		const mx = new Mixture(`(citrus-lime)${componentId()}` satisfies CitrusJuiceId, [
			{
				name: 'water',
				mass: 90,
				item: SubstanceComponent.new('water'),
			},
			{
				name: 'citric acid',
				mass: 5.8,
				item: SubstanceComponent.new('citric-acid'),
			},
			{
				name: 'malic acid',
				mass: 0.2,
				item: SubstanceComponent.new('malic-acid'),
			},
			{
				name: 'sugar',
				mass: 0.75,
				item: SubstanceComponent.new('fructose'),
			},
			{
				name: 'sugar',
				mass: 0.75,
				item: SubstanceComponent.new('glucose'),
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
		const mx = new Mixture(`(citrus-orange)${componentId()}` satisfies CitrusJuiceId, [
			{
				name: 'water',
				mass: 88,
				item: SubstanceComponent.new('water'),
			},
			{
				name: 'citric acid',
				mass: 1.2,
				item: SubstanceComponent.new('citric-acid'),
			},
			{
				name: 'malic acid',
				mass: 0.2,
				item: SubstanceComponent.new('malic-acid'),
			},
			{
				name: 'sugar',
				mass: 5,
				item: SubstanceComponent.new('fructose'),
			},
			{
				name: 'sugar',
				mass: 5,
				item: SubstanceComponent.new('glucose'),
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
		const mx = new Mixture(`(citrus-grapefruit)${componentId()}` satisfies CitrusJuiceId, [
			{
				name: 'water',
				mass: 90,
				item: SubstanceComponent.new('water'),
			},
			{
				name: 'citric acid',
				mass: 1.2,
				item: SubstanceComponent.new('citric-acid'),
			},
			{
				name: 'malic acid',
				mass: 0.3,
				item: SubstanceComponent.new('malic-acid'),
			},
			{
				name: 'sugar',
				mass: 3.5,
				item: SubstanceComponent.new('fructose'),
			},
			{
				name: 'sugar',
				mass: 3.5,
				item: SubstanceComponent.new('glucose'),
			},
		]).setVolume(volume);
		return mx;
	},
} as const satisfies Record<CitrusJuiceName, (volume: number) => Mixture>;

export function newPreservative(volume: number): Mixture {
	const mx = new Mixture(componentId(), [
		{
			name: 'sodium benzoate',
			mass: 15,
			item: SubstanceComponent.new('sodium-benzoate'),
		},
		{
			name: 'potassium sorbate',
			mass: 25,
			item: SubstanceComponent.new('potassium-sorbate'),
		},
		{
			name: 'water',
			mass: 100,
			item: SubstanceComponent.new('water'),
		},
	]).setVolume(volume);
	return mx;
}

export function newZeroSyrup(volume: number, desiredBrix = 66.67): Mixture {
	const preservative = newPreservative(100);
	const mx = new Mixture(componentId(), [
		{
			name: 'sucralose',
			mass: 1,
			item: SubstanceComponent.new('sucralose'),
		},
		{
			name: 'allulose',
			mass: 250,
			item: SubstanceComponent.new('allulose'),
		},
		{
			name: 'preservative',
			mass: preservative.mass / 100,
			item: preservative,
		},
		{
			name: 'buffer acid',
			mass: 1.3,
			item: SubstanceComponent.new('citric-acid'),
		},
		{
			name: 'buffer base',
			mass: 1,
			item: SubstanceComponent.new('sodium-citrate'),
		},
		{
			name: 'water',
			// add water to make up the volume to 1000
			mass: 890.7899,
			item: SubstanceComponent.new('water'),
		},
	]);

	// we need to adjust the sweetness to the desired brix
	// it's too hard to measure tiny quantities of sucralose, so we'll
	// adjust the sweetness by adjusting the allulose mass
	const [, alluloseId] = mx.ingredientIds;
	if ((mx.ingredients.get(alluloseId)!.item as SubstanceComponent).substanceId !== 'allulose') {
		throw new Error('Allulose not found');
	}
	// we'll also need to adjust the water mass to keep the volume at 1000
	// while we're adjusting proportions to hit the desired sweetness
	const water = [...mx.ingredients.values()].find(({ item }) => isWaterComponent(item));
	if (!water) throw new Error('Water not found');

	seek(mx, {
		message: 'Adjusting allulose mass to desired brix',
		throwOnFail: true,
		maxIterations: 100,
		predicate: (mx) => isClose(mx.brix, desiredBrix, 0.01),
		adjuster: (mx) => {
			const actualBrix = mx.brix;
			mx.scaleIngredientMass(alluloseId, desiredBrix / actualBrix);
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
