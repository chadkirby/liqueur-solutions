import type { Component, ComponentNumberKeys, SpiritData } from './component.js';
import type { Target } from './solver.js';
import { round, analyze } from './utils.js';

export class Ethanol implements Component {
	readonly type = 'spirit';
	static density = 0.79;

	readonly abv = 100;
	readonly brix = 0;
	readonly sugarVolume = 0;
	readonly sugarMass = 0;
	readonly waterVolume = 0;
	readonly waterMass = 0;

	static is(component: unknown): component is Ethanol {
		return component instanceof Ethanol;
	}

	constructor(
		public volume: number,
		public locked: SpiritData['locked'] = []
	) {}
	get rawData(): SpiritData {
		const { type, volume, abv, locked } = this;
		return { type, volume, abv, locked };
	}
	get data(): SpiritData {
		const { type, volume, abv } = this;
		return { type, volume: round(volume, 1), abv: round(abv, 1), locked: this.locked };
	}
	set data(data: SpiritData) {
		this.volume = data.volume;
		this.locked = data.locked;
	}
	get componentObjects() {
		return [this];
	}

	clone() {
		return new Ethanol(this.volume, this.locked);
	}

	get isValid() {
		return this.volume >= 0;
	}

	get alcoholVolume() {
		return this.volume;
	}
	get alcoholMass() {
		return this.alcoholVolume * Ethanol.density;
	}
	get mass() {
		return this.alcoholMass;
	}
	analyze(precision = 0): Target & { mass: number } {
		return analyze(this, precision);
	}

	canEdit(key: ComponentNumberKeys): boolean {
		return ['volume', 'alcoholVolume'].includes(key) ? !this.locked.includes('volume') : false;
	}
	set(key: ComponentNumberKeys, value: number) {
		if (this.canEdit(key)) {
			switch (key) {
				case 'volume':
				case 'alcoholVolume':
					this.volume = value;
					break;
				default:
					return;
			}
		}
	}
}
