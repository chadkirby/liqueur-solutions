import type { Component, ComponentNumberKeys } from './component.js';
import type { Target } from './solver.js';
import { analyze } from './utils.js';

export class Mixture<T extends Component = Component> {
	constructor(readonly components: Array<{ name: string; component: T }> = []) {}

	clone() {
		return new Mixture<T>(
			this.components.map((item) => ({
				name: item.name,
				component: item.component.clone() as T
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

	findComponent(predicate: (component: T) => boolean): T | undefined {
		return this.components.find(({ component }) => predicate(component))?.component;
	}

	findByType<X extends Component>(is: (x: unknown) => x is X): X | undefined {
		return this.components.find(({ component }) => is(component))?.component as X | undefined;
	}


	// iterator to iterate over components
	[Symbol.iterator]() {
		return this.components[Symbol.iterator]();
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
		return this.components.reduce((sum, { component }) => sum + component[key], 0);
	}

	analyze(precision = 0): Target & {
		mass: number;
	} {
		return analyze(this, precision);
	}
}
