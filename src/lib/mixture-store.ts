import { writable, get, derived } from 'svelte/store';
import { isSweetenerData, SweetenerTypes, type SerializedComponent } from './component.js';
import { Sweetener } from './sweetener.js';
import { Water } from './water.js';
import type { Analysis } from './utils.js';
import { Mixture, dataToMixture } from './mixture.js';
import { goto } from '$app/navigation';
import { solver } from './solver.js';

export type ComponentValueKey = keyof Analysis;

export function createMixtureStore() {
	const store = writable({
		title: 'mixture',
		mixture: new Mixture([]),
		errors: [] as Array<{ componentId: string; key: ComponentValueKey }>,
		totals: getTotals(new Mixture([]))
	});
	const { subscribe, set } = store;

	function getTotals(mixture: Mixture) {
		if (!mixture.isValid) {
			throw new Error('Invalid mixture');
		}
		return mixture.analyze(1);
	}

	function update(updater: Parameters<typeof store.update>[0]) {
		store.update((data) => {
			const newData = updater(data);
			if (newData.mixture.isValid) {
				newData.totals = getTotals(newData.mixture);
				updateUrl(newData.mixture);
			}
			return newData;
		});
	}

	return {
		get() {
			return get(store);
		},
		set(...args: Parameters<typeof store.set>) {
			store.set(...args);
			store.update((data) => {
				data.totals = getTotals(data.mixture);
				updateUrl(data.mixture);
				return data;
			});
		},
		subscribe,
		getMixture() {
			return get(store).mixture;
		},
		errorStore(componentId: string, key: ComponentValueKey) {
			return derived(store, ($store) => {
				return $store.errors.some((e) => e.componentId === componentId && e.key === key);
			});
		},
		resetError(componentId: string, key: ComponentValueKey) {
			update((data) => {
				data.errors = data.errors.filter((e) => e.componentId !== componentId || e.key !== key);
				return data;
			});
		},
		setTitle(title: string) {
			update((data) => {
				data.title = title;
				return data;
			});
		},
		addComponents(components: Mixture['components']) {
			update((data) => {
				for (const component of components) {
					data.mixture.addComponent({ ...component });
				}
				return data;
			});
		},
		removeComponent(componentId: string) {
			update((data) => {
				data.mixture.removeComponent(componentId);
				return data;
			});
		},
		replaceComponent(
			componentId: string,
			{ name, component }: Pick<Mixture['components'][0], 'name' | 'component'>
		) {
			update((data) => {
				data.mixture.replaceComponent(componentId, { name, component });
				return data;
			});
		},
		setVolume(componentId: string, newVolume: number): void {
			if (componentId === 'totals') {
				this.solveTotal('volume', newVolume);
				return;
			}
			update((data) => {
				const working = data.mixture.clone();
				const component = working.findById(componentId);
				// clear any errors
				data.errors = data.errors.filter(
					(e) => `${e.componentId}-${e.key}` !== `${componentId}-volume`
				);

				if (component instanceof Water) {
					const water = component.clone();
					water.setVolume(newVolume);
					if (!roundEq(water.volume, newVolume)) {
						data.errors.push({ componentId, key: 'volume' });
						return data;
					}
					component.data = water.data;
				} else if (component instanceof Mixture) {
					const mx = component.clone();
					mx.setVolume(newVolume);
					if (!roundEq(mx.volume, newVolume)) {
						data.errors.push({ componentId, key: 'volume' });
						return data;
					}
					component.data = mx.data;
				} else if (component instanceof Sweetener) {
					const sweetener = component.clone();
					sweetener.setVolume(newVolume);
					if (!roundEq(sweetener.volume, newVolume)) {
						data.errors.push({ componentId, key: 'volume' });
						return data;
					}
					component.data = sweetener.data;
				}

				data.mixture = working;

				return data;
			});
		},
		setAbv(componentId: string, newAbv: number): void {
			if (componentId === 'totals') {
				this.solveTotal('abv', newAbv);
				return;
			}
			update((data) => {
				const component = data.mixture.findById(componentId);
				if (!component) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				// clear any errors
				data.errors = data.errors.filter(
					(e) => `${e.componentId}-${e.key}` !== `${componentId}-abv`
				);
				if (component instanceof Mixture && component.findComponent((c) => c.abv > 0)) {
					const spirit = component.clone();
					spirit.setAbv(newAbv);
					if (!roundEq(spirit.abv, newAbv)) {
						data.errors.push({ componentId, key: 'abv' });
						return data;
					}
					component.data = spirit.data;
				} else {
					throw new Error(`Unable to set abv of component ${componentId}`);
				}

				return data;
			});
		},
		setMass(componentId: string, newMass: number): void {
			if (componentId === 'totals') {
				throw new Error('Cannot set mass of totals');
			}
			update((data) => {
				const component = data.mixture.findById(componentId);
				if (!component) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				// clear any errors
				data.errors = data.errors.filter(
					(e) => `${e.componentId}-${e.key}` !== `${componentId}-mass`
				);
				if (isSweetenerData(component.data)) {
					const sweetener = new Sweetener(component.data.subType, newMass);
					component.data = sweetener.data;
				} else {
					throw new Error(`Unable to set mass of component ${componentId}`);
				}

				return data;
			});
		},
		setBrix(componentId: string, newBrix: number): void {
			if (componentId === 'totals') {
				this.solveTotal('brix', newBrix);
				return;
			}
			update((data) => {
				const component = data.mixture.findById(componentId);
				if (!component) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				// clear any errors
				data.errors = data.errors.filter(
					(e) => `${e.componentId}-${e.key}` !== `${componentId}-brix`
				);

				if (component instanceof Mixture) {
					const syrup = component.clone();
					syrup.setBrix(newBrix);
					if (!roundEq(syrup.brix, newBrix)) {
						data.errors.push({ componentId, key: 'brix' });
						return data;
					}
					component.data = syrup.data;
				} else {
					throw new Error(`Unable to set brix of component ${componentId}`);
				}

				return data;
			});
		},
		updateComponentName(componentId: string, newName: string): void {
			update((data) => {
				const component = data.mixture.components.find((c) => c.id === componentId);
				if (!component) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				component.name = newName;
				return data;
			});
		},
		updateSweetenerSubType: (id: string, subType: SweetenerTypes) => {
			store.update((data) => {
				const component = data.mixture.components.find((c) => c.id === id);
				if (component && component.component instanceof Sweetener) {
					// This will trigger the mixture's recalculations since
					// subType affects equivalentSugarMass and other derived
					// values
					component.component.subType = subType;
				}
				return data;
			});
		},

		solveTotal(key: keyof Analysis, requestedValue: number): void {
			update((data) => {
				// remove any totals errors
				data.errors = data.errors.filter((e) => `${e.componentId}-${e.key}` !== `totals-${key}`);
				const mixture = this.getMixture().clone();
				try {
					solveTotal(mixture, key, requestedValue);
				} catch (error) {
					data.errors.push({ componentId: 'totals', key });
					return data;
				}
				if (!roundEq(mixture[key], requestedValue)) {
					data.errors.push({ componentId: 'totals', key });
					return data;
				}

				data.mixture = mixture;
				return data;
			});
		},
		/** reset the store */
		deserialize(data: { liqueur: string; components: SerializedComponent[] }) {
			console.log('deserialize', data);
			const mixture = dataToMixture(data);
			set({
				title: data.liqueur,
				mixture,
				totals: getTotals(mixture),
				errors: []
			});
		}
	};
}

function roundEq(a: number, b: number) {
	return Math.round(a) === Math.round(b);
}

export const mixtureStore = createMixtureStore();

export function updateUrl(mixture = mixtureStore.getMixture()) {
	if (mixture.isValid) {
		goto(
			`/${encodeURIComponent(mixtureStore.get().title)}?gz=${encodeURIComponent(mixture.serialize())}`,
			{
				replaceState: true,
				noScroll: true,
				keepFocus: true
			}
		);
	}
}

function solveTotal(mixture: Mixture, key: keyof Analysis, targetValue: number): void {
	if (!mixture.canEdit(key)) {
		throw new Error(`${key} is not editable`);
	}

	let working: Mixture | undefined;
	switch (key) {
		case 'volume':
			working = mixture.clone();
			working.setVolume(targetValue);
			break;
		case 'abv':
			working = solver(mixture, { abv: targetValue, brix: mixture.brix, volume: null });
			working.setVolume(mixture.volume);
			break;
		case 'brix':
			working = solver(mixture, { abv: mixture.abv, brix: targetValue, volume: null });
			working.setVolume(mixture.volume);
			break;
	}
	if (!working) {
		throw new Error(`Unable to solve for ${key} = ${targetValue}`);
	}
	// test that the solution is valid
	if (!working.isValid) {
		throw new Error(`Invalid solution for ${key} = ${targetValue}`);
	}
	if (working[key].toFixed() !== targetValue.toFixed()) {
		throw new Error(`Unable to solve for ${key} = ${targetValue}`);
	}

	for (const [i, obj] of mixture.componentObjects.entries()) {
		obj.data = working.componentObjects[i].rawData;
	}
}
