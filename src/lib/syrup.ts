import type { ComponentNumberKeys, SyrupData } from './component.js';
import { Mixture } from './mixture.js';
import { Sugar } from './sugar.js';
import { computeSg, round } from './utils.js';
import { Water } from './water.js';

export class Syrup extends Mixture {
	readonly type = 'syrup';
	private _volume: number;
	private _brix: number;

	static is(component: unknown): component is Syrup {
		return component instanceof Syrup;
	}

	constructor(
		volume: number,
		brix: number,
		public locked: SyrupData['locked']
	) {
		super([
			{ name: 'water', component: new Water(0, 'none') },
			{ name: 'sugar', component: new Sugar(0, 'none') }
		]);
		this._volume = volume;
		this._brix = brix;
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

	get sugarComponent() {
		const component = this.componentObjects.find(Sugar.is);
		if (!component) throw new Error('Sugar component not found');
		return component;
	}

	get data(): SyrupData {
		const { type, volume, brix } = this;
		return { type, volume: round(volume, 1), brix: round(brix, 1), locked: this.locked };
	}
	set data(data: SyrupData) {
		this._volume = data.volume;
		this._brix = data.brix;
		this.locked = data.locked;
		this.updateComponents();
	}

	canEdit(key: ComponentNumberKeys): boolean {
		return ['volume', 'brix'].includes(key)
			? !this.locked.includes(key)
			: ['sugarMass', 'waterVolume'].includes(key)
			? this.locked === 'none'
			: false;
	}

	clone() {
		return new Syrup(this._volume, this._brix, this.locked);
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
