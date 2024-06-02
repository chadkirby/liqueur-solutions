import {
	BaseComponent,
	type Component,
	type ComponentNumberKeys,
	type SugarData
} from './component.js';
import { round } from './utils.js';

export class Sugar extends BaseComponent implements Component {
	static density = 1.59;

	readonly type = 'sugar';
	readonly abv = 0;
	readonly brix = 100;
	readonly waterVolume = 0;
	readonly waterMass = 0;
	readonly alcoholVolume = 0;
	readonly alcoholMass = 0;

	static is(component: unknown): component is Sugar {
		return component instanceof Sugar;
	}

	constructor(public mass: number) {
		super();
	}

	get rawData(): SugarData {
		const { type, mass } = this;
		return { type, mass };
	}
	get data(): SugarData {
		const { type, mass } = this;
		return { type, mass: round(mass, 1) };
	}
	set data(data: SugarData) {
		this.mass = data.mass;
	}
	static fromData(data: SugarData) {
		return new Sugar(data.mass);
	}

	canEdit(key: ComponentNumberKeys | string): boolean {
		return ['sugarMass', 'mass', 'volume'].includes(key);
	}

	clone() {
		return new Sugar(this.mass);
	}
	get componentObjects() {
		return [this];
	}

	get isValid() {
		return this.mass >= 0;
	}

	get sugarVolume() {
		return this.mass / Sugar.density;
	}
	get volume() {
		return this.sugarVolume;
	}
	get sugarMass() {
		return this.mass;
	}

	set(key: ComponentNumberKeys, value: number) {
		if (this.canEdit(key)) {
			switch (key) {
				case 'volume':
					this.mass = value * Sugar.density;
					break;
				case 'mass':
				case 'sugarMass':
					this.mass = value;
					break;
				default:
					return;
			}
		}
	}
}
