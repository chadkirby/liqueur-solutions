import type { SpiritData } from './component.js';
import { Ethanol } from './ethanol.js';
import { Mixture } from './mixture.js';
import { round, serialize } from './utils.js';
import { Water } from './water.js';

export class Spirit extends Mixture<{ water: Water; ethanol: Ethanol }> {
	readonly type = 'spirit';
	private _volume: number;
	private _abv: number;
	constructor(volume: number, abv: number) {
		super({
			water: new Water(0),
			ethanol: new Ethanol(0)
		});
		this._volume = volume;
		this._abv = abv;
		this.updateComponents();
	}

	get data(): SpiritData {
		const { type, volume, abv } = this;
		return { type, volume: round(volume, 1), abv: round(abv, 1) };
	}

	serialize(): string {
		return serialize(this.data);
	}

	clone() {
		return new Spirit(this._volume, this._abv);
	}

	updateComponents() {
		this.components.water.volume = this._volume * (1 - this._abv / 100);
		this.components.ethanol.volume = this._volume * (this._abv / 100);
	}

	setVolume(volume: number) {
		this.volume = volume;
	}

	get volume() {
		return super.volume;
	}

	set volume(volume: number) {
		this._volume = volume;
		this.updateComponents();
	}

	get abv() {
		return super.abv;
	}
	set abv(abv: number) {
		this._abv = abv;
		this.updateComponents();
	}
}
