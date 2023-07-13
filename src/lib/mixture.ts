import type { Component, ComponentNumberKeys } from './component.js';
import type { Ethanol } from './ethanol.js';
import { solveProportions, type Target } from './solver.js';
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
	get abv() {
		return (100 * this.alcoholVolume) / this.volume;
	}
	set abv(newAbv: number) {
		if (newAbv === this.abv) return;
		const solution = solveProportions(newAbv, this.brix);
		this.updateFromSolution(solution.mixture);
	}
	get brix() {
		return (100 * this.sugarMass) / this.mass;
	}
	set brix(newBrix: number) {
		if (newBrix === this.brix) return;
		const solution = solveProportions(this.abv, newBrix);
		this.updateFromSolution(solution.mixture);
	}
	get volume() {
		return this.sumComponents('volume');
	}
	set volume(newVolume: number) {
		const originalVolume = this.volume;
		if (originalVolume === newVolume) return;
		const factor = newVolume / originalVolume;
		for (const { component } of this) {
			component.volume *= factor;
		}
	}
	get waterVolume() {
		return this.sumComponents('waterVolume');
	}
	set waterVolume(newVolume: number) {
		const originalVolume = this.waterVolume;
		if (originalVolume === newVolume) return;
		const factor = newVolume / originalVolume;
		for (const { component } of this) {
			component.volume *= factor;
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
		if (originalVolume === newVolume) return;
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

	private updateFromSolution(solution: Mixture) {
		// keep the alcohol volume the same
		solution.alcoholVolume = this.alcoholVolume;

		const waterItems = this.componentObjects.filter(Water.is);
		// temporarily remove water
		for (const water of waterItems) {
			water.volume = 0;
		}

		// update syrup items
		const syrupItems = this.componentObjects.filter((x): x is Syrup => x.type === 'syrup');
		const syrupProportions = syrupItems.map((x) => x.sugarMass / this.sugarMass);
		for (const [i, item] of syrupItems.entries()) {
			const proportion = syrupProportions[i];
			const desiredMass = Math.round(solution.sugarMass * proportion);
			item.sugarMass = desiredMass;
		}
		// check whether adding syrup left us with too much water
		if (this.waterVolume > solution.waterVolume) {
			const excessWater = this.waterVolume - solution.waterVolume;
			// remove the excess water from the syrup items
			for (const [i, item] of syrupItems.entries()) {
				const proportionalExcess = excessWater * syrupProportions[i];
				item.waterVolume -= proportionalExcess;
			}
		}

		if (Math.round(this.sugarMass) !== Math.round(solution.sugarMass)) {
			const sugarItem = this.componentObjects.find(Sugar.is) ?? new Sugar(0);
			if (!this.componentObjects.includes(sugarItem)) {
				this.components.push({ name: 'sugar', component: sugarItem });
			}
			sugarItem.sugarMass += solution.sugarMass - this.sugarMass;
		}

		if (Math.round(this.waterVolume) !== Math.round(solution.waterVolume)) {
			const waterItem = waterItems.length ? waterItems[0] : new Water(0);

			// update water
			if (!this.componentObjects.includes(waterItem)) {
				this.components.push({ name: 'water', component: waterItem });
			}

			waterItem.volume += solution.waterVolume - this.waterVolume;
		}
	}
}
