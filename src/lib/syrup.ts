import type { ComponentNumberKeys, SyrupData } from './component.js';
import { Mixture } from './mixture.js';
import { Sugar } from './sweetener.js';
import { round } from './utils.js';
import { Water } from './water.js';

// see https://www.vinolab.hr/calculator/gravity-density-sugar-conversions-en19

function computeSg(brix: number) {
	return (
		0.00000005785037196 * brix ** 3 +
		0.00001261831344 * brix ** 2 +
		0.003873042366 * brix +
		0.9999994636
	);
}

export class SugarSyrup extends Mixture {
	readonly type = 'sugar-syrup';
	private _volume: number;
	private _brix: number;

	constructor(volume: number, brix: number) {
		super([
			{ name: 'water', id: 'water', component: new Water(0) },
			{ name: 'sugar', id: 'sugar', component: new Sugar(0) }
		]);
		this._volume = volume;
		this._brix = brix;
		this.updateComponents();
	}

	get componentObjects() {
		return this.components.map(({ component }) => component);
	}

	get waterComponent() {
		const component = this.componentObjects.find((o) => o instanceof Water);
		if (!component) throw new Error('Water component not found');
		return component;
	}

	get sugarComponent() {
		const component = this.componentObjects.find((obj) => obj instanceof Sugar);
		if (!component) throw new Error('Sugar component not found');
		return component;
	}

	get rawData(): SyrupData {
		const { type, volume, brix } = this;
		return { type, volume, brix };
	}
	get data(): SyrupData {
		const { type, volume, brix } = this;
		return { type, volume: round(volume, 1), brix: round(brix, 1) };
	}
	set data(data: SyrupData) {
		this._volume = data.volume;
		this._brix = data.brix;
		this.updateComponents();
	}

	canEdit(key: ComponentNumberKeys | string): boolean {
		return ['sugarMass', 'waterVolume', 'volume', 'brix'].includes(key);
	}

	clone() {
		return new SugarSyrup(this._volume, this._brix);
	}

	private updateComponents() {
		const desiredVolume = this._volume;
		const brix = this._brix;

		const specificGravity = computeSg(brix);

		// Calculate total mass of the solution
		const massSolution = desiredVolume * specificGravity;

		// Calculate mass of the sugar
		const massSugar = (massSolution * brix) / 100;

		// Calculate mass of the water
		const massWater = massSolution - massSugar;

		this.waterComponent.volume = massWater / Water.density;
		this.sugarComponent.mass = massSugar;

		// because specificGravity is an approximation, we need to correct
		// the components to ensure that the computed volume matches the
		// desired volume
		const correction = desiredVolume / this.volume;
		this.waterComponent.volume *= correction;
		this.sugarComponent.mass *= correction;
	}

	get volume() {
		return super.volume;
	}

	set(key: ComponentNumberKeys, value: number) {
		if (this.canEdit(key)) {
			switch (key) {
				case 'volume':
					this._volume = value;
					break;
				case 'brix':
					this._brix = value;
					break;
				case 'waterVolume':
					{
						// update the water component, but maintain the same brix
						this.waterComponent.volume = value;
						this.sugarComponent.mass = this._brix * 0.01 * value * Sugar.density;
					}
					break;
				case 'sugarMass':
					{
						// update the sugar component, but maintain the same brix
						const factor = value / this.sugarMass;
						this.sugarComponent.mass = value;
						this.waterComponent.volume *= factor;
					}
					break;
				default:
					return;
			}
			this.updateComponents();
		}
	}

	get brix() {
		return this._brix;
	}

	get sugarMass() {
		return super.sugarMass;
	}

	get waterVolume() {
		return super.waterVolume;
	}
}
