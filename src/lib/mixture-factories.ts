import { componentId, Mixture } from './index.svelte.js';
import { calculateAbvProportions } from './ingredients/density.js';
import { SubstanceComponent } from './ingredients/substance-component.js';

export function newSpirit(vol = 100, abv = 40): Mixture {
	const props = calculateAbvProportions(abv, 100);
	const mx = new Mixture(componentId(), 0, [
		{
			name: 'ethanol',
			mass: props.ethanolMass,
			component: SubstanceComponent.new('ethanol')
		},
		{
			name: 'water',
			mass: props.waterMass,
			component: SubstanceComponent.new('water')
		}
	]).setVolume(vol);

	return mx;
}

export function newSyrup(volume: number, brix: number): Mixture {
	const mx = new Mixture(componentId(), 1, [
		{
			name: 'sugar',
			proportion: brix / 100,
			component: SubstanceComponent.new('sucrose')
		},
		{
			name: 'water',
			proportion: 1 - brix / 100,
			component: SubstanceComponent.new('water')
		}
	]).setVolume(volume);
	return mx;
}

export function newLemon(volume: number): Mixture {
	// approximate lemon juice as 6% citric acid, 2% fructose/glucose, 92% water
	const mx = new Mixture(componentId(), 100, [
		{
			name: 'water',
			proportion: 0.92,
			component: SubstanceComponent.new('water')
		},
		{
			name: 'citric acid',
			proportion: 0.06,
			component: SubstanceComponent.new('citric-acid')
		},
		{
			name: 'sugar',
			proportion: 0.01,
			component: SubstanceComponent.new('fructose')
		},
		{
			name: 'sugar',
			proportion: 0.01,
			component: SubstanceComponent.new('glucose')
		}
	]).setVolume(volume);
	return mx;
}
