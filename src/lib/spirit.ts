import type { ComponentNumberKeys, SpiritData } from './component.js';
import { Ethanol } from './ethanol.js';
import { Mixture } from './mixture.js';
import { round } from './utils.js';
import { Water } from './water.js';

export class Spirit extends Mixture {
	readonly type = 'spirit';
	private _volume: number;
	private _abv: number;

	static is(component: unknown): component is Spirit {
		return component instanceof Spirit;
	}

	constructor(volume: number, abv: number) {
		super([
			{ name: 'water', id: 'water', component: new Water(0) },
			{ name: 'ethanol', id: 'ethanol', component: new Ethanol(0) }
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

	get rawData(): SpiritData {
		const { type, volume, abv } = this;
		return { type, volume, abv };
	}
	get data(): SpiritData {
		const { type, volume, abv } = this;
		return { type, volume: round(volume, 1), abv: round(abv, 1) };
	}
	set data(data: SpiritData) {
		this._volume = data.volume;
		this._abv = data.abv;
		this.updateComponents();
	}
	static fromData(data: SpiritData) {
		return new Spirit(data.volume, data.abv);
	}

	canEdit(key: ComponentNumberKeys | string): boolean {
		return ['alcoholVolume', 'volume', 'abv'].includes(key);
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

	get alcoholVolume() {
		return super.alcoholVolume;
	}

	get waterVolume() {
		return super.waterVolume;
	}

	get abv() {
		return super.abv;
	}

	set(key: ComponentNumberKeys, value: number) {
		if (this.canEdit(key)) {
			switch (key) {
				case 'volume':
					this._volume = value;
					break;
				case 'waterVolume':
					// maintain the same abv
					this._volume = value / (1 - this._abv / 100);
					break;
				case 'abv':
					this._abv = value;
					break;
				case 'alcoholVolume':
					{
						// maintain the same abv, adjust the volume
						this._volume = value / (this._abv / 100);
					}
					break;
				default:
					return;
			}
			this.updateComponents();
		}
	}
}
