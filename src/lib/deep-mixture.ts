import { Mixture } from './mixture.js';

function deepGet(getter: (mx: Mixture) => number | -1, mixture: Mixture): number | -1 {
	const value = getter(mixture);
	if (value !== -1) return value;
	for (const ingredient of mixture.ingredients.values()) {
		if (ingredient.item instanceof Mixture) {
			const value = deepGet(getter, ingredient.item);
			if (value !== -1) return value;
		}
	}
	return -1;
}

function deepSet<T>(
	setter: (mx: Mixture, value: T) => boolean,
	mixture: Mixture,
	value: T,
): boolean {
	const wasSet = setter(mixture, value);
	if (wasSet) return true;
	for (const ingredient of mixture.ingredients.values()) {
		if (ingredient.item instanceof Mixture) {
			const wasSet = deepSet(setter, ingredient.item, value);
			if (wasSet) return true;
		}
	}
	return false;
}

export const deep = {
	getIngredientAbv(mixture: Mixture, id: string): number | -1 {
		return deepGet((mx) => mx.getIngredientAbv(id), mixture);
	},

	getIngredientBrix(mixture: Mixture, id: string): number | -1 {
		return deepGet((mx) => mx.getIngredientBrix(id), mixture);
	},

	getIngredientVolume(mixture: Mixture, id: string): number | -1 {
		return deepGet((mx) => mx.getIngredientVolume(id), mixture);
	},

	getIngredientMass(mixture: Mixture, id: string): number | -1 {
		return deepGet((mx) => mx.getIngredientMass(id), mixture);
	},

	setIngredientVolume(mixture: Mixture, id: string, value: number): boolean {
		return deepSet((mx, value) => mx.setIngredientVolume(id, value), mixture, value);
	},

	setIngredientMass(mixture: Mixture, id: string, value: number): boolean {
		return deepSet((mx, value) => mx.setIngredientMass(id, value), mixture, value);
	},

	removeIngredient(mixture: Mixture, id: string): boolean {
		return deepSet((mx) => mx.removeIngredient(id), mixture, undefined);
	},
};
