import { Mixture } from './mixture.js';

export function deepGet(getter: (mx: Mixture) => number | false, mixture: Mixture): number | false {
	const value = getter(mixture);
	if (value !== false) return value;
	for (const { ingredient } of mixture.eachIngredient()) {
		if (ingredient.item instanceof Mixture) {
			const value = deepGet(getter, ingredient.item);
			if (value !== false) return value;
		}
	}
	return false;
}

export function deepSet<T>(setter: (mx: Mixture) => boolean, mixture: Mixture): boolean {
	const wasSet = setter(mixture);
	if (wasSet) return true;
	for (const { ingredient } of mixture.eachIngredient()) {
		if (ingredient.item instanceof Mixture) {
			const wasSet = deepSet(setter, ingredient.item);
			if (wasSet) return true;
		}
	}
	return false;
}

export const deep = {
	setIngredientVolume(mixture: Mixture, id: string, value: number): boolean {
		return deepSet((mx) => mx.setIngredientVolume(id, value), mixture);
	},

	setIngredientMass(mixture: Mixture, id: string, value: number): boolean {
		return deepSet((mx) => mx.setIngredientMass(value, id), mixture);
	},

	removeIngredient(mixture: Mixture, id: string): boolean {
		return deepSet((mx) => mx.removeIngredient(id), mixture);
	},
};
