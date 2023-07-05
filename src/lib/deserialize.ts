import {
	isComponentValueKey,
	type BaseComponentData,
	isComponentType,
	type SpiritData,
	type WaterData,
	type SugarData,
	type SyrupData
} from './component.js';
import { Spirit } from './spirit.js';
import { Sugar } from './sugar.js';
import { Syrup } from './syrup.js';
import { Water } from './water.js';

export function deserialize(qs: string | URLSearchParams) {
	const params = typeof qs === 'string' ? new URLSearchParams(qs) : qs;
	const liqueur = params.get('liqueur') ?? 'mixture';
	const components: Array<{
		name: string;
		data: SpiritData | WaterData | SugarData | SyrupData;
	}> = [];
	const working: Partial<BaseComponentData & { name: string; type: string }>[] = [];
	for (const [key, value] of params) {
		if (key === 'liqueur') continue;
		if (key === 'name') {
			working.push({ name: value });
		} else {
			const current = working.at(-1);
			if (!current) throw new Error('Keys must be preceded by a component name');
			if (isComponentValueKey(key)) {
				current[key] = parseFloat(value);
			} else if (key === 'type' && isComponentType(value)) {
				current.type = value;
			}
		}
	}
	for (const { type, ...values } of working) {
		switch (type) {
			case undefined: {
				break;
			}
			case 'spirit': {
				const { volume, abv, name } = values;
				if (name && undefined !== volume && undefined !== abv) {
					components.push({ name, data: new Spirit(volume, abv).data });
				}
				break;
			}
			case 'water': {
				const { volume, name } = values;
				if (name && undefined !== volume) {
					components.push({ name, data: new Water(volume).data });
				}
				break;
			}
			case 'sugar': {
				const { mass, name } = values;
				if (name && undefined !== mass) {
					components.push({ name, data: new Sugar(mass).data });
				}
				break;
			}
			case 'syrup': {
				const { volume, brix, name } = values;
				if (name && undefined !== volume && undefined !== brix) {
					components.push({ name, data: new Syrup(volume, brix).data });
				}
				break;
			}
			default:
				throw new Error(`Unknown component type: ${type}`);
		}
	}

	return { liqueur, components };
}
