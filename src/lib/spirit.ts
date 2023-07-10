import type { SpiritData } from './component.js';
import { Ethanol } from './ethanol.js';
import { Mixture } from './mixture.js';
import { round } from './utils.js';
import { Water } from './water.js';

export class Spirit extends Mixture<Water | Ethanol> {
	readonly type = 'spirit';
	private _volume: number;
	private _abv: number;

	static is(component: unknown): component is Spirit {
		return component instanceof Spirit;
	}

	constructor(volume: number, abv: number) {
		super([
			{ name: 'water', component: new Water(0) },
			{ name: 'ethanol', component: new Ethanol(0) }
		]);
		this._volume = volume;
		this._abv = abv;
		this.updateComponents();
	}

	get componentObjects() {
		return this.components.map(({ component }) => component);
	}

	get waterComponent() {
		const component = this.componentObjects.find(Water.is);
		if (!component) throw new Error('Water component not found');
		return component;
	}

	get ethanolComponent() {
		const component = this.componentObjects.find(Ethanol.is);
		if (!component) throw new Error('Ethanol component not found');
		return component;
	}

	get data(): SpiritData {
		const { type, volume, abv } = this;
		return { type, volume: round(volume, 1), abv: round(abv, 1) };
	}

	clone() {
		return new Spirit(this._volume, this._abv);
	}

	updateComponents() {
		this.waterComponent.volume = this._volume * (1 - this._abv / 100);
		this.ethanolComponent.volume = this._volume * (this._abv / 100);
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
