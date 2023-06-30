import type { SyrupData } from "./component.js";
import { Mixture } from "./mixture.js";
import { Sugar } from "./sugar.js";
import { computeSg, round, serialize } from "./utils.js";
import { Water } from "./water.js";

export class Syrup extends Mixture<{ water: Water; sugar: Sugar }> {
	readonly type = 'syrup';
	private _volume: number;
	private _brix: number;
	constructor(volume: number, brix: number) {
		super({
			water: new Water(0),
			sugar: new Sugar(0)
		});
		this._volume = volume;
		this._brix = brix;
		this.updateComponents();
	}
	get data(): SyrupData {
		const { type, volume, brix } = this;
		return { type, volume: round(volume, 1), brix: round(brix, 1) };
	}

	serialize(): string {
		return serialize(this.data);
	}

	clone() {
		return new Syrup(this._volume, this._brix);
	}
	setVolume(volume: number) {
		this.volume = volume;
	}

	updateComponents() {
		const desiredVolume = this._volume;
		const brix = this._brix;

		const specificGravity = computeSg(brix);

		// Calculate total mass of the solution
		const massSolution = desiredVolume * specificGravity;

		// Calculate mass of the sugar
		const massSugar = (massSolution * brix) / 100;

		// Calculate mass of the water
		const massWater = massSolution - massSugar;

		this.components.water.volume = massWater / Water.density;
		this.components.sugar.mass = massSugar;

    // because specificGravity is an approximation, we need to correct
    // the components to ensure that the computed volume matches the
    // desired volume
    const correction = desiredVolume/this.volume;
    this.components.water.volume *= correction;
    this.components.sugar.mass *= correction;
	}

	get volume() {
		return super.volume;
	}

	set volume(volume: number) {
		this._volume = volume;
		this.updateComponents();
	}
}
