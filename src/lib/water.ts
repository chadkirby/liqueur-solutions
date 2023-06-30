import type { Component, WaterData } from "./component.js";
import type { Target } from './solver.js';
import { round, serialize, analyze } from './utils.js';

export class Water implements Component {
	readonly type = 'water';
	static density = 1;

	readonly abv = 0;
	readonly brix = 0;
	readonly sugarVolume = 0;
	readonly sugarMass = 0;
	readonly alcoholVolume = 0;
	readonly alcoholMass = 0;

	constructor(public volume: number) {}
	get data(): WaterData {
		const { type, volume } = this;
		return { type, volume: round(volume, 1) };
	}
	serialize(): string {
		return serialize(this.data);
	}
	clone() {
		return new Water(this.volume);
	}
	analyze(precision = 0): Target & { mass: number } {
		return analyze(this, precision);
	}
	setVolume(volume: number) {
		this.volume = volume;
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
}
