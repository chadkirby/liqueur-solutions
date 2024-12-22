import {
	BaseComponent,
	SweetenerTypes,
	type Component,
	type ComponentNumberKeys,
	type SweetenerData
} from './index.js';

type Sweetnesss = {
	density: number;
	sweetness: number;
	kcalPerGram: number;
};

export const SweetenerEquivData: Record<SweetenerTypes, Sweetnesss> = {
	sucrose: { density: 1.59, sweetness: 100, kcalPerGram: 3.87 },
	fructose: { density: 1.48, sweetness: 173, kcalPerGram: 3.73 },
	allulose: { density: 1.6, sweetness: 70, kcalPerGram: 0.4 },
	erythritol: { density: 1.45, sweetness: 65, kcalPerGram: 0.2 },
	sucralose: { density: 1.2, sweetness: 60000, kcalPerGram: 0 }
} as const;

export class Sweetener extends BaseComponent implements Component {
	readonly type = 'sweetener';

	readonly abv = 0;
	readonly waterVolume = 0;
	readonly waterMass = 0;
	readonly alcoholVolume = 0;
	readonly alcoholMass = 0;

	constructor(
		private _subType: SweetenerTypes,
		public mass: number
	) {
		super();
	}

	canEdit(key: ComponentNumberKeys | string): boolean {
		switch (key as ComponentNumberKeys) {
			case 'equivalentSugarMass':
			case 'mass':
			case 'volume':
				return true;
			default:
				return false;
		}
	}

	describe() {
		if (this.subType === 'sucrose') {
			return `sugar`;
		}
		return `${this._subType} sweetener`;
	}

	setVolume(volume: number) {
		this.mass = volume * this.density;
	}

	get componentObjects() {
		return [this];
	}

	get isValid() {
		return this.mass >= 0;
	}

	get subType() {
		return this._subType;
	}

	set subType(subType: SweetenerTypes) {
		const { equivalentSugarMass } = this;
		this._subType = subType;
		this.setEquivalentSugarMass(equivalentSugarMass);
	}

	get data(): SweetenerData {
		const { type, subType, mass } = this;
		return { type, subType, mass };
	}
	set data(data: SweetenerData) {
		this._subType = data.subType;
		this.mass = data.mass;
	}

	clone(): Sweetener {
		return new Sweetener(this._subType, this.mass);
	}

	get volume() {
		return this.mass / this.density;
	}
	set volume(value: number) {
		this.mass = value * this.density;
	}
	get equivalentSugarMass() {
		return this.mass * (SweetenerEquivData[this._subType].sweetness / 100);
	}
	set equivalentSugarMass(value: number) {
		this.setEquivalentSugarMass(value);
	}

	setEquivalentSugarMass(mass: number): void {
		this.mass = mass / (SweetenerEquivData[this._subType].sweetness / 100);
	}

	get density() {
		return SweetenerEquivData[this._subType].density;
	}

	get brix() {
		return SweetenerEquivData[this._subType].sweetness;
	}

	get kcal() {
		return this.mass * SweetenerEquivData[this._subType].kcalPerGram;
	}
}

export function isSweetener(component: unknown): component is Sweetener {
	return component instanceof Sweetener;
}
