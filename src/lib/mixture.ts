import type { Component, ComponentNumberKeys } from './component.js';
import { Ethanol } from './ethanol.js';
import { solver } from './solver.js';
import type { Spirit } from './spirit.js';
import { Sugar } from './sugar.js';
import type { Syrup } from './syrup.js';
import { analyze, type Analysis } from './utils.js';
import { Water } from './water.js';

type AnyComponent = Spirit | Water | Sugar | Syrup | Ethanol;

export class Mixture {
	constructor(
		readonly components: Array<{ name: string; id: string; component: AnyComponent }> = []
	) {}

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
				} else if (k === 'locked') {
					params.append(k, v.length ? v.join('+') : 'none');
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

	// iterator to iterate over components
	[Symbol.iterator]() {
		return this.components[Symbol.iterator]();
	}

	canEdit(key: ComponentNumberKeys): boolean {
		if (key === 'abv') {
			return (
				this.components.some(({ component }) => component.componentObjects.some(Ethanol.is)) &&
				this.canEdit('volume')
			);
		}
		if (key === 'brix') {
			return (
				this.components.some(({ component }) => component.componentObjects.some(Sugar.is)) &&
				this.canEdit('volume')
			);
		}
		return this.components.some(({ component }) => component.canEdit(key));
	}

	get abv() {
		return (100 * this.alcoholVolume) / this.volume;
	}
	setAbv(targetAbv: number) {
		if (targetAbv === this.abv) return;
		const working = solver(this, targetAbv, this.brix);
		for (const [i, obj] of this.componentObjects.entries()) {
			obj.data = working.componentObjects[i].data;
		}
	}
	get brix() {
		return (100 * this.sugarMass) / this.mass;
	}
	setBrix(newBrix: number) {
		if (isClose(newBrix, this.brix)) return;
		const working = solver(this, this.abv, newBrix);
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
		if (isClose(originalVolume, newVolume)) return;
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
		const waterComponent = this.findByType(Water.is);
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
			component.set('volume', component.volume * factor);
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
		const sugarComponent = this.findByType(Sugar.is);
		if (sugarComponent) {
			sugarComponent.mass += newMass - this.sugarMass;
			return;
		}

		const factor = newMass / this.sugarMass;
		for (const { component } of this) {
			if (component.canEdit('sugarMass') && component !== sugarComponent) {
				component.set('sugarMass', component.sugarMass * factor);
			}
		}
	}
	get mass() {
		return this.sumComponents('mass');
	}

	private sumComponents(key: ComponentNumberKeys, components = this.components): number {
		return components.reduce((sum, { component }) => sum + component[key], 0);
	}

	analyze(precision = 0): Analysis {
		return analyze(this, precision);
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
}

function isClose(a: number, b: number) {
	return Math.abs(a - b) < 0.01;
}
