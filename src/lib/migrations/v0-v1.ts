import { SubstanceComponent } from '$lib/ingredients/substance-component.js';
import type { StoredFileDataV0, FileDataV1, V0MixtureData } from '$lib/data-format.js';
import { componentId, Mixture } from '$lib/mixture.js';

export function portV0DataToV1(data: Pick<StoredFileDataV0, 'mixture' | 'desc'>): FileDataV1 {
	const { components } = data.mixture.data;
	const mixture = makeMixture(components);
	return {
		version: 1,
		id: componentId(),
		name: data.mixture.name,
		accessTime: new Date().toISOString(),
		desc: data.desc || mixture.describe(),
		rootMixtureId: mixture.id,
		ingredientDb: mixture.serialize(),
		_ingredientHash: mixture.getIngredientHash(data.mixture.name),
	};
}

function makeMixture(components: V0MixtureData['components']): Mixture {
	const mixture = new Mixture();
	for (const c of components ?? []) {
		if (c.data.type === 'mixture') {
			const subMixture = makeMixture(c.data.components ?? []);
			mixture.addIngredient({
				name: c.name,
				mass: subMixture.mass,
				item: subMixture,
			});
		} else {
			const substance = makeSubstance(c.data.type, c.data.subType);
			// data.mass should exist for sweeteners, but other substances
			// only have volume, which we need to convert to mass using the
			// substance's density
			const mass = c.data.mass ?? substance.substance.pureDensity * c.data.volume;
			mixture.addIngredient({
				name: c.name,
				mass,
				item: substance,
			});
		}
	}
	return mixture;
}

function makeSubstance(
	type: 'ethanol' | 'water' | 'sweetener',
	subType?: 'sucrose' | 'fructose' | 'allulose' | 'erythritol' | 'sucralose',
): SubstanceComponent {
	if (type === 'sweetener') {
		return SubstanceComponent.new(subType ?? 'sucrose');
	}
	return SubstanceComponent.new(type);
}
