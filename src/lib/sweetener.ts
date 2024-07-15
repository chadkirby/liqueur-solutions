import {
	BaseComponent,
	SweetenerTypes,
	type Component,
	type ComponentNumberKeys,
	type SweetenerData
} from './component.js';
import { round } from './utils.js';

export abstract class Sweetener extends BaseComponent implements Component {
	readonly type = 'sweetener';
	abstract subType: (typeof SweetenerTypes)[number];

	readonly abv = 0;
	readonly waterVolume = 0;
	readonly waterMass = 0;
	readonly alcoholVolume = 0;
	readonly alcoholMass = 0;

	constructor(
		public mass: number,
		private density: number
	) {
		super();
	}

	canEdit(key: ComponentNumberKeys | string): boolean {
		return ['sugarMass', 'mass', 'volume'].includes(key);
	}

	get componentObjects() {
		return [this];
	}

	get isValid() {
		return this.mass >= 0;
	}

	get rawData(): SweetenerData {
		const { type, subType, mass } = this;
		return { type, subType, mass };
	}
	get data(): SweetenerData {
		const { type, subType, mass } = this;
		return { type, subType, mass: round(mass, 1) };
	}
	set data(data: SweetenerData) {
		this.subType = data.subType;
		this.mass = data.mass;
	}

	get sugarVolume() {
		return this.mass / this.density;
	}
	get volume() {
		return this.sugarVolume;
	}
	get sugarMass() {
		return this.mass;
	}

	abstract clone(): Sweetener;

	set(key: ComponentNumberKeys, value: number) {
		if (this.canEdit(key)) {
			switch (key) {
				case 'volume':
					this.mass = value * this.density;
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

export function isSweetener(component: unknown): component is Sweetener {
	return component instanceof Sweetener;
}

export class Sugar extends Sweetener implements Component {
	static density = 1.59;

	subType = 'sucrose' as const;
	readonly brix = 100;

	get kcal() {
		return this.mass * 3.87;
	}

	constructor(public mass: number) {
		super(mass, Sugar.density);
	}

	clone() {
		return new Sugar(this.mass);
	}
}

export class Fructose extends Sweetener implements Component {
	static density = 1.48;

	subType = 'fructose' as const;
	readonly brix = 173;

	get kcal() {
		return this.mass * 3.73;
	}

	constructor(public mass: number) {
		super(mass, Fructose.density);
	}

	clone() {
		return new Fructose(this.mass);
	}
}

export class Allulose extends Sweetener implements Component {
	static density = 1.6;

	subType = 'allulose' as const;
	readonly brix = 70;

	get kcal() {
		return this.mass * 0.4;
	}

	constructor(public mass: number) {
		super(mass, Allulose.density);
	}

	clone() {
		return new Allulose(this.mass);
	}
}

export class Erythritol extends Sweetener implements Component {
	static density = 1.45;

	subType = 'erythritol' as const;
	readonly brix = 65;

	get kcal() {
		return this.mass * 0.2;
	}

	constructor(public mass: number) {
		super(mass, Erythritol.density);
	}

	clone() {
		return new Erythritol(this.mass);
	}
}

export class Sucralose extends Sweetener implements Component {
	static density = 1.2;

	subType = 'sucralose' as const;
	readonly brix = 6000;

	get kcal() {
		return 0;
	}

	constructor(public mass: number) {
		super(mass, Sucralose.density);
	}

	clone() {
		return new Sucralose(this.mass);
	}
}

export function getSweetenerComponent(subType: 'sucrose', mass: number): Sugar;
export function getSweetenerComponent(subType: 'fructose', mass: number): Fructose;
export function getSweetenerComponent(subType: 'allulose', mass: number): Allulose;
export function getSweetenerComponent(subType: 'erythritol', mass: number): Erythritol;
export function getSweetenerComponent(subType: 'sucralose', mass: number): Sucralose;
export function getSweetenerComponent(
	subType: (typeof SweetenerTypes)[number],
	mass: number
): Sweetener;
export function getSweetenerComponent(
	subType: (typeof SweetenerTypes)[number],
	mass: number
): Sweetener {
	switch (subType) {
		case 'sucrose':
			return new Sugar(mass);
		case 'fructose':
			return new Fructose(mass);
		case 'allulose':
			return new Allulose(mass);
		case 'erythritol':
			return new Erythritol(mass);
		case 'sucralose':
			return new Sucralose(mass);
	}
}
