import type { Component, ComponentNumberKeys } from './component.js';
import type { Target } from './solver.js';
import { analyze } from './utils.js';

export class Mixture<T extends Record<string, Component>> {
	constructor(readonly components: T = {} as T) {}

	serialize(precision = 0): string {
		const params = new URLSearchParams();
		for (const [key, component] of this) {
			params.append('name', key);
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

	get mixtureData() {
		return Object.fromEntries([...this].map(([k, v]) => [k, v.data]));
	}
	clone() {
		return new Mixture<T>(
			Object.fromEntries(
				Object.entries(this.components).map(([key, component]) => [key, component.clone()])
			) as T
		);
	}
	// iterator to iterate over components
	[Symbol.iterator]() {
		return Object.entries(this.components)[Symbol.iterator]();
	}
	get abv() {
		return (100 * this.alcoholVolume) / this.volume;
	}
	get brix() {
		return (100 * this.sugarMass) / this.mass;
	}
	get volume() {
		return this.sumComponents('volume');
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
	get sugarVolume() {
		return this.sumComponents('sugarVolume');
	}
	get sugarMass() {
		return this.sumComponents('sugarMass');
	}
	get mass() {
		return this.sumComponents('mass');
	}

	private sumComponents(key: ComponentNumberKeys): number {
		return Object.values(this.components).reduce((sum, component) => sum + component[key], 0);
	}

	analyze(precision = 0): Target & {
		mass: number;
	} {
		return analyze(this, precision);
	}
}
