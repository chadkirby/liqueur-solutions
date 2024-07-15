import { BaseComponent, type Component, type ComponentNumberKeys } from './component.js';
import { Ethanol } from './ethanol.js';
import type { ComponentValueKey } from './mixture-store.js';
import { solver } from './solver.js';
import type { Spirit } from './spirit.js';
import { Sugar, type Sweetener } from './sweetener.js';
import type { SugarSyrup } from './syrup.js';
import type { Analysis } from './utils.js';
import { Water } from './water.js';

export type AnyComponent = Spirit | Water | Sweetener | SugarSyrup | Ethanol;

export class Mixture extends BaseComponent {
	constructor(
		readonly components: Array<{ name: string; id: string; component: AnyComponent }> = []
	) {
		super();
	}

	clone() {
		return new Mixture(
			this.components.map((item) => ({
				name: item.name,
				id: item.id,
				component: item.component.clone()
			}))
		);
	}

	serialize(precision = 0): string {
		const params = new URLSearchParams();
		for (const { name, component } of this) {
			params.append('name', name);
			for (const [k, v] of Object.entries(component.data)) {
				if (typeof v === 'number') {
					params.append(k, v.toFixed(precision));
				} else {
					params.append(k, v);
				}
			}
		}
		return params.toString();
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
		let inc = 0;
		let id = `${component.type}-${inc}`;
		while (this.findById(id)) {
			id = `${component.type}-${++inc}`;
		}
		this.components.push({ id, name, component });
	}

	removeComponent(id: string) {
		const index = this.components.findIndex((c) => c.id === id);
		if (index >= 0) {
			this.components.splice(index, 1);
		}
	}

	// iterator to iterate over components
	[Symbol.iterator]() {
		return this.components[Symbol.iterator]();
	}

	canEdit(key: ComponentNumberKeys | string): boolean {
		if (key === 'abv') {
			return (
				this.components.some(({ component }) =>
					component.componentObjects.some((o) => o instanceof Ethanol)
				) && this.canEdit('volume')
			);
		}
		if (key === 'brix') {
			return (
				this.components.some(({ component }) =>
					component.componentObjects.some((o) => o instanceof Sugar)
				) && this.canEdit('volume')
			);
		}
		return this.components.some(({ component }) => component.canEdit(key));
	}

	get abv() {
		return (100 * this.alcoholVolume) / this.volume;
	}
	setAbv(targetAbv: number) {
		if (targetAbv === this.abv) return;
		const working = solver(this, { abv: targetAbv, brix: this.brix, volume: null });
		for (const [i, obj] of this.componentObjects.entries()) {
			obj.data = working.componentObjects[i].data;
		}
	}
	get brix() {
		return (100 * this.sugarMass) / this.mass;
	}
	setBrix(newBrix: number) {
		if (isClose(newBrix, this.brix)) return;
		const working = solver(this, { abv: this.abv, brix: newBrix, volume: null });
		for (const [i, obj] of this.componentObjects.entries()) {
			obj.data = working.componentObjects[i].data;
		}
	}

	get unlockedVolume() {
		return this.sumComponents(
			'volume',
			this.components.filter(({ component }) => component.canEdit('volume'))
		);
	}
	get lockedVolume() {
		return this.sumComponents(
			'volume',
			this.components.filter(({ component }) => !component.canEdit('volume'))
		);
	}
	get volume() {
		return this.sumComponents('volume');
	}
	setVolume(newVolume: number) {
		const originalVolume = this.volume;
		if (isClose(originalVolume, newVolume, 0.001)) return;
		const factor = newVolume / originalVolume;
		for (const { component } of this) {
			component.set('volume', component.volume * factor);
		}
	}
	get waterVolume() {
		return this.sumComponents('waterVolume');
	}
	setWaterVolume(newVolume: number) {
		if (isClose(this.waterVolume, newVolume)) return;
		// try to effect the change using a water component
		const waterComponent = this.findByType((o) => o instanceof Water);
		if (waterComponent) {
			waterComponent.volume += newVolume - this.waterVolume;
			return;
		}

		const factor = newVolume / this.waterVolume;
		for (const { component } of this) {
			if (component.canEdit('waterVolume')) {
				component.set('waterVolume', component.waterVolume * factor);
			}
		}
	}

	get waterMass() {
		return this.sumComponents('waterMass');
	}
	get alcoholVolume() {
		return this.sumComponents('alcoholVolume');
	}
	setAlcoholVolume(newVolume: number) {
		const originalVolume = this.alcoholVolume;
		if (isClose(originalVolume, newVolume)) return;
		const factor = newVolume / originalVolume;
		for (const { component } of this) {
			if (component.canEdit('alcoholVolume')) {
				component.set('alcoholVolume', component.alcoholVolume * factor);
			}
		}
	}
	get alcoholMass() {
		return this.sumComponents('alcoholMass');
	}
	get sugarVolume() {
		return this.sumComponents('sugarVolume');
	}
	get sugarMass() {
		return this.sumComponents('sugarMass');
	}
	setSugarMass(newMass: number) {
		if (isClose(this.sugarMass, newMass)) return;
		// try to effect the change using a sugar component
		const sugarComponent = this.findByType((o) => o instanceof Sugar);
		if (sugarComponent) {
			sugarComponent.mass += newMass - this.sugarMass;
			return;
		}

		const factor = newMass / this.sugarMass;
		for (const { component } of this) {
			if (component.canEdit('sugarMass')) {
				component.set('sugarMass', component.sugarMass * factor);
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

	set(key: ComponentNumberKeys, value: number) {
		if (this.canEdit(key)) {
			switch (key) {
				case 'volume':
					this.setVolume(value);
					break;
				case 'waterVolume':
					this.setWaterVolume(value);
					break;
				case 'alcoholVolume':
					this.setAlcoholVolume(value);
					break;
				case 'sugarMass':
					this.setSugarMass(value);
					break;
				case 'abv':
					this.setAbv(value);
					break;
				case 'brix':
					this.setBrix(value);
					break;
				default:
					return;
			}
		}
	}

	get(key: ComponentNumberKeys): number {
		switch (key) {
			case 'volume':
				return this.volume;
			case 'waterVolume':
				return this.waterVolume;
			case 'alcoholVolume':
				return this.alcoholVolume;
			case 'sugarVolume':
				return this.sugarVolume;
			case 'sugarMass':
				return this.sugarMass;
			case 'mass':
				return this.mass;
			case 'abv':
				return this.abv;
			case 'brix':
				return this.brix;
			default:
				return NaN;
		}
	}

	solveTotal(key: keyof Analysis, targetValue: number, locked: ComponentValueKey[]): void {
		if (!this.canEdit(key)) {
			throw new Error(`${key} is not editable`);
		}
		let working: Mixture | undefined;
		switch (key) {
			case 'volume':
				working = this.clone();
				working.set('volume', targetValue);
				break;
			case 'abv':
			case 'brix':
				{
					const targetAbv = key === 'abv' ? targetValue : locked.includes('abv') ? this.abv : null;
					const targetBrix =
						key === 'brix' ? targetValue : locked.includes('brix') ? this.brix : null;
					working = solver(this, { abv: targetAbv, brix: targetBrix, volume: null });
					if (locked.includes('volume')) {
						working.set('volume', this.volume);
					}
				}
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

		for (const [i, obj] of this.componentObjects.entries()) {
			obj.data = working.componentObjects[i].rawData;
		}
	}
}

function isClose(a: number, b: number, delta = 0.01) {
	return Math.abs(a - b) < delta;
}
