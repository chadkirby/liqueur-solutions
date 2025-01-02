import { componentId, Mixture } from './index.svelte.js';
import { calculateAbvProportions } from './ingredients/density.js';
import { SubstanceComponent } from './ingredients/substance-component.js';

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

// Lemon juice (~100ml):
// Water: ~89-90ml
// Citric acid: ~5-6g (primary acid)
// Malic acid: ~0.2-0.3g
// Sugars: ~2.5g (mix of fructose/glucose)
export function newLemon(volume: number): Mixture {
	const mx = new Mixture(`(citrus-lemon)${componentId()}`, 100, [
		{
			name: 'water',
			proportion: 90,
			component: SubstanceComponent.new('water'),
		},
		{
			name: 'citric acid',
			proportion: 5.5,
			component: SubstanceComponent.new('citric-acid'),
		},
		{
			name: 'malic acid',
			proportion: 0.5,
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
}

// Lime juice (~100ml):
// Water: ~90-91ml
// Citric acid: ~5-6g (similar to lemon)
// Malic acid: ~0.1-0.2g
// Sugars: ~1.5g
export function newLime(volume: number): Mixture {
	const mx = new Mixture(`(citrus-lime)${componentId()}`, 100, [
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
}

// Orange juice (~100ml):
// Water: ~87-88ml
// Citric acid: ~1-1.2g
// Malic acid: ~0.1-0.2g
// Sugars: ~9-10g
export function newOrange(volume: number): Mixture {
	const mx = new Mixture(`(citrus-orange)${componentId()}`, 100, [
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
}

// Grapefruit juice (~100ml):
// Water: ~90-91ml
// Citric acid: ~1.2-1.5g
// Malic acid: ~0.3-0.4g
// Sugars: ~7-8g
export function newGrapefruit(volume: number): Mixture {
	const mx = new Mixture(`(citrus-grapefruit)${componentId()}`, 100, [
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
}

export function isCitrus(mx: Mixture): boolean {
	return mx.id.startsWith('(citrus-');
}
export function isLemon(mx: Mixture): boolean {
	return mx.id.startsWith('(citrus-lemon)');
}
export function isLime(mx: Mixture): boolean {
	return mx.id.startsWith('(citrus-lime)');
}
export function isOrange(mx: Mixture): boolean {
	return mx.id.startsWith('(citrus-orange)');
}
export function isGrapefruit(mx: Mixture): boolean {
	return mx.id.startsWith('(citrus-grapefruit)');
}
