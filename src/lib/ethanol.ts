import {
	BaseComponent,
	type Component,
	type ComponentNumberKeys,
	type SpiritData
} from './component.js';
import { round } from './utils.js';

export class Ethanol extends BaseComponent implements Component {
	readonly type = 'spirit';
	static density = 0.79;

	readonly abv = 100;
	readonly brix = 0;
	readonly sugarVolume = 0;
	readonly sugarMass = 0;
	readonly waterVolume = 0;
	readonly waterMass = 0;

	static is(component: unknown): component is Ethanol {
		return component instanceof Ethanol;
	}

	constructor(public volume: number) {
		super();
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

	canEdit(key: ComponentNumberKeys | string): boolean {
		return ['volume', 'alcoholVolume'].includes(key);
	}
	set(key: ComponentNumberKeys, value: number) {
		if (this.canEdit(key)) {
			switch (key) {
				case 'volume':
				case 'alcoholVolume':
					this.volume = value;
					break;
				default:
					return;
			}
		}
	}
}
