import type { Component, ComponentNumberKeys } from './component.js';
import type { Ethanol } from './ethanol.js';
import { solver, type Target } from './solver.js';
import type { Spirit } from './spirit.js';
import { Sugar } from './sugar.js';
import type { Syrup } from './syrup.js';
import { analyze } from './utils.js';
import { Water } from './water.js';

type AnyComponent = Spirit | Water | Sugar | Syrup | Ethanol;

export class Mixture {
	constructor(readonly components: Array<{ name: string; component: AnyComponent }> = []) {}

	clone() {
		return new Mixture(
			this.components.map((item) => ({
				name: item.name,
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

	// iterator to iterate over components
	[Symbol.iterator]() {
		return this.components[Symbol.iterator]();
	}
	get hasWater(): boolean {
		return this.components.some(({ component }) => component.hasWater);
	}
	get hasSugar(): boolean {
		return this.components.some(({ component }) => component.hasSugar);
	}

	get abv() {
		return (100 * this.alcoholVolume) / this.volume;
	}
	set abv(targetAbv: number) {
		if (targetAbv === this.abv) return;
		if (!this.hasWater) throw new Error('Cannot adjust ABV of a mixture with no water');
		const working = solver(this, targetAbv, this.brix);
		for (const [i, obj] of this.componentObjects.entries()) {
			obj.data = working.componentObjects[i].data;
		}
	}
	get brix() {
		return (100 * this.sugarMass) / this.mass;
	}
	set brix(newBrix: number) {
		if (isClose(newBrix, this.brix)) return;
		if (!this.hasSugar) throw new Error('Cannot adjust Brix of a mixture with no sugar');
		const working = solver(this, this.abv, newBrix);
		for (const [i, obj] of this.componentObjects.entries()) {
			obj.data = working.componentObjects[i].data;
		}
	}

	get volume() {
		return this.sumComponents('volume');
	}
	set volume(newVolume: number) {
		const originalVolume = this.volume;
		if (isClose(originalVolume, newVolume)) return;
		const factor = newVolume / originalVolume;
		for (const { component } of this) {
			component.volume *= factor;
		}
	}
	get waterVolume() {
		return this.sumComponents('waterVolume');
	}
	set waterVolume(newVolume: number) {
		if (isClose(this.waterVolume, newVolume)) return;
		if (!this.hasWater) throw new Error('Cannot adjust water volume of a mixture with no water');

		// try to effect the change using a water component
		const waterComponent = this.findByType(Water.is);
		if (waterComponent) {
			waterComponent.volume += newVolume - this.waterVolume;
			return;
		}

		const factor = newVolume / this.waterVolume;
		for (const { component } of this) {
			if (component.hasWater) {
				component.waterVolume *= factor;
			}
		}
	}

	get waterMass() {
		return this.sumComponents('waterMass');
	}
	get alcoholVolume() {
		return this.sumComponents('alcoholVolume');
	}
	set alcoholVolume(newVolume: number) {
		const originalVolume = this.alcoholVolume;
		if (isClose(originalVolume, newVolume)) return;
		const factor = newVolume / originalVolume;
		for (const { component } of this) {
			component.volume *= factor;
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
	set sugarMass(newMass: number) {
		if (isClose(this.sugarMass, newMass)) return;
		if (!this.hasSugar) throw new Error('Cannot adjust sugar mass of a mixture with no sugar');

		// try to effect the change using a sugar component
		const sugarComponent = this.findByType(Sugar.is);
		if (sugarComponent) {
			sugarComponent.mass += newMass - this.sugarMass;
			return;
		}

		const factor = newMass / this.sugarMass;
		for (const { component } of this) {
			if (component.hasSugar && component !== sugarComponent) {
				component.sugarMass *= factor;
			}
		}
	}
	get mass() {
		return this.sumComponents('mass');
	}

	private sumComponents(key: ComponentNumberKeys): number {
		return this.components.reduce((sum, { component }) => sum + component[key], 0);
	}

	analyze(precision = 0): Target & {
		mass: number;
	} {
		return analyze(this, precision);
	}

	get isValid(): boolean {
		return this.components.every(({ component }) => component.isValid);
	}
}

function isClose(a: number, b: number) {
	return Math.abs(a - b) < 0.01;
}
