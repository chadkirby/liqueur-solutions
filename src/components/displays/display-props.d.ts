export interface DisplayProps {
	componentId: string;
	component: IngredientItemComponent;
	mass: number;
	mixtureStore: MixtureStore;
	readonly?: boolean;
	class?: string;
}
