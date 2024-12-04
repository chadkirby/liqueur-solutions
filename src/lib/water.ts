import {
	BaseComponent,
	type Component,
	type ComponentNumberKeys,
	type WaterData
} from './component.js';

export class Water extends BaseComponent implements Component {
	readonly type = 'water';
	static density = 1;

	readonly abv = 0;
	readonly brix = 0;
	readonly equivalentSugarMass = 0;
	readonly alcoholVolume = 0;
	readonly alcoholMass = 0;

	constructor(public volume: number) {
		super();
	}

	describe() {
		return `water`;
	}
	get data(): WaterData {
		const { type, volume } = this;
		return { type, volume };
	}
	set data(data: WaterData) {
		this.volume = data.volume;
	}
	get componentObjects() {
		return [this];
	}

	canEdit(key: ComponentNumberKeys | string): boolean {
		return ['volume', 'waterVolume'].includes(key);
	}

	clone() {
		return new Water(this.volume);
	}
	get isValid() {
		return this.volume >= 0;
	}

	get waterVolume() {
		return this.volume;
	}
	get waterMass() {
		return this.waterVolume * Water.density;
	}
	get mass() {
		return this.waterMass;
	}
	get kcal() {
		return 0;
	}

	setVolume(volume: number) {
		this.volume = volume;
	}

	setEquivalentSugarMass(): void {
		// do nothing
	}
}
