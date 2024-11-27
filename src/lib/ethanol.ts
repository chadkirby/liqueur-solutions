import {
	BaseComponent,
	type EthanolData,
	type Component,
	type ComponentNumberKeys
} from './component.js';
import { round, format } from './utils.js';

export class Ethanol extends BaseComponent implements Component {
	readonly type = 'ethanol';
	static density = 0.79;

	readonly abv = 100;
	readonly brix = 0;
	readonly equivalentSugarMass = 0;
	readonly waterVolume = 0;
	readonly waterMass = 0;

	constructor(public volume: number) {
		super();
	}

	describe() {
		return `${format(this.volume, { unit: 'ml' })} ethanol`;
	}

	get rawData(): EthanolData {
		const { type, volume } = this;
		return { type, volume };
	}
	get data(): EthanolData {
		const { type, volume } = this;
		return { type, volume: round(volume, 1) };
	}
	set data(data: EthanolData) {
		this.volume = data.volume;
	}
	get componentObjects() {
		return [this];
	}

	clone() {
		return new Ethanol(this.volume);
	}

	get isValid() {
		return this.volume >= 0;
	}

	get alcoholVolume() {
		return this.volume;
	}
	get alcoholMass() {
		return this.alcoholVolume * Ethanol.density;
	}
	get mass() {
		return this.alcoholMass;
	}

	get kcal() {
		return this.mass * 7.1;
	}

	setVolume(volume: number) {
		this.volume = volume;
	}

	setEquivalentSugarMass(): void {
		// do nothing
	}

	canEdit(key: ComponentNumberKeys | string): boolean {
		return ['volume', 'alcoholVolume'].includes(key);
	}
}
