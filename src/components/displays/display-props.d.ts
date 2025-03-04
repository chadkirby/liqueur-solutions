import type { MixtureStore } from '$lib/mixture-store.svelte.js';

export interface DisplayProps {
	ingredientId: string;
	ingredientItem: IngredientItemComponent;
	mass: number;
	mixtureStore: MixtureStore;
	readonly?: boolean;
	class?: string;
}
