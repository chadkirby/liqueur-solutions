import type { SyrupData } from './component.js';
import { Mixture } from './mixture.js';
import { Sugar } from './sugar.js';
import { computeSg, round } from './utils.js';
import { Water } from './water.js';

export class Syrup extends Mixture<Water | Sugar> {
	readonly type = 'syrup';
	private _volume: number;
	private _brix: number;

	static is(component: unknown): component is Syrup {
		return component instanceof Syrup;
	}

	constructor(volume: number, brix: number) {
		super([
			{ name: 'water', component: new Water(0) },
			{ name: 'sugar', component: new Sugar(0) }
		]);
		this._volume = volume;
		this._brix = brix;
		this.updateComponents();
	}

	get componentObjects() {
		return this.components.map(({ component }) => component);
	}

	get waterComponent() {
		const component = this.componentObjects.find( Water.is);
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
		return { type, volume: round(volume, 1), brix: round(brix, 1) };
	}

	clone() {
		return new Syrup(this._volume, this._brix);
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

	set volume(volume: number) {
		this._volume = volume;
		this.updateComponents();
	}

	get brix() {
		return this._brix;
	}
	set brix(brix: number) {
		this._brix = brix;
		this.updateComponents();
	}
}
