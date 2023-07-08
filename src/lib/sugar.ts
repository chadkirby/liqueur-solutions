import type { Component, SugarData } from "./component.js";
import type { Target } from './solver.js';
import { round, analyze } from './utils.js';

export class Sugar implements Component {
	static density = 1.59;

	readonly type = 'sugar';
	readonly abv = 0;
	readonly brix = 100;
	readonly waterVolume = 0;
	readonly waterMass = 0;
	readonly alcoholVolume = 0;
	readonly alcoholMass = 0;

	static is(component: unknown): component is Sugar {
		return component instanceof Sugar;
	}

	constructor(public mass: number) {}

	get data(): SugarData {
		const { type, mass } = this;
		return { type, mass: round(mass, 1) };
	}

	clone() {
		return new Sugar(this.mass);
	}

	get isValid() {
		return this.mass >= 0;
	}

	analyze(precision = 0): Target & { mass: number } {
		return analyze(this, precision);
	}
	get sugarVolume() {
		return this.mass / Sugar.density;
	}
	get volume() {
		return this.sugarVolume;
	}
	set volume(volume: number) {
		this.mass = volume * Sugar.density;
	}
	get sugarMass() {
		return this.mass;
	}
}
