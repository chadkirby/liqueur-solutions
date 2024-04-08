import type { Component, ComponentNumberKeys, WaterData } from './component.js';
import type { Target } from './solver.js';
import { round, analyze } from './utils.js';

export class Water implements Component {
	readonly type = 'water';
	static density = 1;

	readonly abv = 0;
	readonly brix = 0;
	readonly sugarVolume = 0;
	readonly sugarMass = 0;
	readonly alcoholVolume = 0;
	readonly alcoholMass = 0;

	static is(component: unknown): component is Water {
		return component instanceof Water;
	}

	constructor(
		public volume: number,
		public locked: WaterData['locked'] = []
	) {}
	get data(): WaterData {
		const { type, volume } = this;
		return { type, volume: round(volume, 1), locked: this.locked };
	}
	set data(data: WaterData) {
		this.volume = data.volume;
		this.locked = data.locked;
	}
	get componentObjects() {
		return [this];
	}

	canEdit(key: ComponentNumberKeys): boolean {
		return ['volume', 'waterVolume'].includes(key) ? this.locked.length === 0 : false;
	}

	clone() {
		return new Water(this.volume, this.locked);
	}
	analyze(precision = 0): Target & { mass: number } {
		return analyze(this, precision);
	}

	get isValid() {
		return this.volume >= 0;
	}

	get waterVolume() {
		return this.volume;
	}
	get waterMass() {
		return this.waterVolume * Water.density;
	}
	get mass() {
		return this.waterMass;
	}

	set(key: ComponentNumberKeys, value: number) {
		if (this.canEdit(key)) {
			switch (key) {
				case 'volume':
				case 'waterVolume':
					this.volume = value;
					break;
				default:
					return;
			}
		}
	}
}
