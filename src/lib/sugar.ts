import type { Component, ComponentNumberKeys, SugarData } from './component.js';
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

	constructor(
		public mass: number,
		public locked: SugarData['locked'] = []
	) {}

	get rawData(): SugarData {
		const { type, mass, locked } = this;
		return { type, mass, locked };
	}
	get data(): SugarData {
		const { type, mass } = this;
		return { type, mass: round(mass, 1), locked: this.locked };
	}
	set data(data: SugarData) {
		this.mass = data.mass;
		this.locked = data.locked;
	}
	static fromData(data: SugarData) {
		return new Sugar(data.mass, data.locked);
	}

	get isLocked() {
		return Boolean(this.locked.length);
	}
	canEdit(key: ComponentNumberKeys): boolean {
		return ['sugarMass', 'mass', 'volume'].includes(key) ? !this.isLocked : false;
	}

	clone() {
		return new Sugar(this.mass, this.locked);
	}
	get componentObjects() {
		return [this];
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
	get sugarMass() {
		return this.mass;
	}

	set(key: ComponentNumberKeys, value: number) {
		if (this.canEdit(key)) {
			switch (key) {
				case 'volume':
					this.mass = value * Sugar.density;
					break;
				case 'mass':
				case 'sugarMass':
					this.mass = value;
					break;
				default:
					return;
			}
		}
	}
}
