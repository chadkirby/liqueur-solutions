import queryString from 'query-string';
import { isEthanolData, isSweetenerData, isMixtureData, isWaterData } from './component.js';
import {
	BaseComponent,
	type MixtureData,
	type Component,
	type ComponentNumberKeys
} from './component.js';
import { Ethanol } from './ethanol.js';
import { solver } from './solver.js';
import { Sweetener } from './sweetener.js';
import { Water } from './water.js';

export type AnyComponent = Water | Sweetener | Ethanol | Mixture;

type MixtureComponent = { name: string; id: string; component: AnyComponent };

export function dataToMixture(d: {
	components: Array<{ name: string; id: string; data: unknown }>;
}) {
	const ingredients: MixtureComponent[] = [];
	for (const component of d.components) {
		const { name, id, data } = component;
		if (isEthanolData(data)) {
			ingredients.push({ name, id, component: new Ethanol(data.volume) });
		} else if (isWaterData(data)) {
			ingredients.push({ name, id, component: new Water(data.volume) });
		} else if (isSweetenerData(data)) {
			ingredients.push({ name, id, component: new Sweetener(data.subType, data.mass) });
		} else if (isMixtureData(data)) {
			ingredients.push({ name, id, component: dataToMixture(data) });
		} else {
			throw new Error('Unknown mixture type');
		}
	}
	return new Mixture(ingredients);
}

export class Mixture extends BaseComponent {
	constructor(readonly components: MixtureComponent[] = []) {
		super();
	}

	get type() {
		return 'mixture' as const;
	}

	get data(): MixtureData {
		return {
			type: this.type,
			components: this.components.map(({ name, id, component }) => ({
				name,
				id,
				data: component.data
			}))
		};
	}

	set data(data: MixtureData) {
		const mx = dataToMixture(data);
		this.components.splice(0, this.components.length, ...mx.components);
	}

	get rawData(): MixtureData {
		return {
			type: this.type,
			components: this.components.map(({ name, id, component }) => ({
				name,
				id,
				data: component.rawData
			}))
		};
	}

	clone(): Mixture {
		return new Mixture(
			this.components.map((item) => ({
				name: item.name,
				id: item.id,
				component: item.component.clone()
			}))
		);
	}

	serialize(): string {
		const { type, components } = this.data;
		return queryString.stringify(
			{ type, components: components.map((c) => JSON.stringify(c)) },
			{ arrayFormat: 'index', sort: false }
		);
	}

	get componentObjects() {
		return this.components.map(({ component }) => component);
	}

	findComponent(predicate: (component: AnyComponent) => boolean): AnyComponent | undefined {
		return this.components.find(({ component }) => predicate(component))?.component;
	}

	findByType<X extends Component>(is: (x: unknown) => x is X): X | undefined {
		return this.components.find(({ component }) => is(component))?.component as X | undefined;
	}

	findById(id: string): AnyComponent | undefined {
		return this.components.find((c) => c.id === id)?.component;
	}

	addComponent({ name, component }: { name: string; component: AnyComponent }) {
		this.components.push({ id: this.getIdForComponent(component), name, component });
	}

	getIdForComponent(component: AnyComponent): string {
		let inc = 0;
		let id = `${component.type}-${inc}`;
		while (this.findById(id)) {
			id = `${component.type}-${++inc}`;
		}
		return id;
	}

	removeComponent(id: string) {
		const index = this.components.findIndex((c) => c.id === id);
		if (index >= 0) {
			this.components.splice(index, 1);
		}
	}

	replaceComponent(id: string, { name, component }: { name: string; component: AnyComponent }) {
		const index = this.components.findIndex((c) => c.id === id);
		if (index < 0) {
			throw new Error(`Unable to find component ${id}`);
		}
		this.components.splice(index, 1, {
			id: this.getIdForComponent(component),
			name,
			component
		});
	}

	// iterator to iterate over components
	[Symbol.iterator]() {
		return this.components[Symbol.iterator]();
	}

	canEdit(key: ComponentNumberKeys | string): boolean {
		if (key === 'brix') {
			return this.components.some(({ component }) => component.canEdit('equivalentSugarMass'));
		}
		if (key === 'abv') {
			const hasEthanol = this.components.some(({ component }) => component instanceof Ethanol);
			if (hasEthanol) return true;
		}

		return this.components.some(({ component }) => component.canEdit(key));
	}

	get abv() {
		return (100 * this.alcoholVolume) / this.volume;
	}
	setAbv(targetAbv: number, maintainVolume = false) {
		if (targetAbv === this.abv) return;
		const working = solver(this, {
			abv: targetAbv,
			brix: this.brix,
			volume: maintainVolume ? this.volume : null
		});
		for (const [i, obj] of this.componentObjects.entries()) {
			obj.data = working.componentObjects[i].data;
		}
	}
	get volume() {
		return this.sumComponents('volume');
	}
	setVolume(newVolume: number) {
		const originalVolume = this.volume;
		if (isClose(originalVolume, newVolume, 0.001)) return;
		const factor = newVolume / originalVolume;
		for (const { component } of this) {
			component.setVolume(component.volume * factor);
		}
	}
	get waterVolume() {
		return this.sumComponents('waterVolume');
	}

	get waterMass() {
		return this.sumComponents('waterMass');
	}
	get alcoholVolume() {
		return this.sumComponents('alcoholVolume');
	}
	get alcoholMass() {
		return this.sumComponents('alcoholMass');
	}

	adjustVolumeForEthanolTarget(targetEthanolVolume: number) {
		const currentAlcoholVolume = this.alcoholVolume;
		if (isClose(currentAlcoholVolume, targetEthanolVolume)) return;
		const factor = targetEthanolVolume / currentAlcoholVolume;
		for (const { component } of this) {
			if (component.abv > 0) {
				component.setVolume(component.volume * factor);
			}
		}
	}

	get brix() {
		return (100 * this.equivalentSugarMass) / this.mass;
	}
	setBrix(newBrix: number, maintainVolume = false) {
		// change the ratio of sweetener to total mass
		if (isClose(newBrix, this.brix)) return;
		const working = solver(this, {
			abv: this.abv,
			brix: newBrix,
			volume: maintainVolume ? this.volume : null
		});
		for (const [i, obj] of this.componentObjects.entries()) {
			obj.data = working.componentObjects[i].data;
		}
	}

	get equivalentSugarMass() {
		return this.sumComponents('equivalentSugarMass');
	}
	setEquivalentSugarMass(newSugarEquivalent: number) {
		const currentSugarEquivalent = this.equivalentSugarMass;
		if (isClose(currentSugarEquivalent, newSugarEquivalent)) return;

		const factor = newSugarEquivalent / this.equivalentSugarMass;
		for (const { component } of this) {
			if (component.brix > 0) {
				component.setVolume(component.volume * factor);
			}
		}
	}
	get mass() {
		return this.sumComponents('mass');
	}

	get kcal() {
		return this.sumComponents('kcal');
	}

	private sumComponents(key: ComponentNumberKeys | 'kcal', components = this.components): number {
		return components.reduce((sum, { component }) => sum + component[key], 0);
	}

	get isValid(): boolean {
		return this.components.every(({ component }) => component.isValid);
	}
}

function isClose(a: number, b: number, delta = 0.01) {
	return Math.abs(a - b) < delta;
}

export function newSpirit(volume: number, abv: number): Mixture {
	const mx = new Mixture([
		{ name: 'ethanol', id: 'ethanol', component: new Ethanol(1) },
		{ name: 'water', id: 'water', component: new Water(1) }
	]);
	mx.setVolume(volume);
	mx.setAbv(abv, true);
	return mx;
}

export function newSyrup(volume: number, brix: number): Mixture {
	const mx = new Mixture([
		{ name: 'sugar', id: 'sugar', component: new Sweetener('sucrose', 1) },
		{ name: 'water', id: 'water', component: new Water(1) }
	]);
	mx.setVolume(volume);
	mx.setBrix(brix, true);
	return mx;
}
