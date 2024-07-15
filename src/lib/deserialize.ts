import {
	isNumericDataValueKey,
	type AnyData,
	isComponentType,
	type SpiritData,
	type WaterData,
	type SweetenerData,
	type SyrupData
} from './component.js';
import { Spirit } from './spirit.js';
import { getSweetenerComponent } from './sweetener.js';
import { SugarSyrup } from './syrup.js';
import { Water } from './water.js';

export function deserialize(qs: string | URLSearchParams) {
	const params = typeof qs === 'string' ? new URLSearchParams(qs) : qs;
	const liqueur = params.get('liqueur') ?? 'mixture';
	const components: Array<{
		name: string;
		id: string;
		data: SpiritData | WaterData | SweetenerData | SyrupData;
	}> = [];
	const working: Partial<AnyData & { name: string }>[] = [];
	for (const [key, value] of params) {
		if (key === 'liqueur') continue;
		if (key === 'name') {
			working.push({ name: value });
		} else {
			const current = working.at(-1) as unknown as Record<string, unknown> | undefined;
			if (!current) throw new Error('Keys must be preceded by a component name');
			if (isNumericDataValueKey(key)) {
				current[key] = parseFloat(value);
			} else if (key === 'type' && isComponentType(value)) {
				current.type = value;
			}
		}
	}
	for (const { name, ...data } of working) {
		switch (data.type) {
			case undefined: {
				break;
			}
			case 'spirit': {
				const spiritData = data as SpiritData;
				const { volume, abv, type } = spiritData;
				if (name && undefined !== volume && undefined !== abv) {
					components.push({
						name,
						id: `${type}-${components.length}`,
						data: new Spirit(volume, abv).data
					});
				}
				break;
			}
			case 'water': {
				const waterData = data as WaterData;
				const { volume, type } = waterData;
				if (name && undefined !== volume) {
					components.push({
						name,
						id: `${type}-${components.length}`,
						data: new Water(volume).data
					});
				}
				break;
			}
			case 'sweetener': {
				const sweetenerData = data as SweetenerData;
				const { mass, type, subType } = sweetenerData;
				if (name && undefined !== mass) {
					components.push({
						name,
						id: `${type}-${subType}-${components.length}`,
						data: getSweetenerComponent(subType, mass).data
					});
				}
				break;
			}
			case 'sugar-syrup': {
				const syrupData = data as SyrupData;
				const { volume, brix, type } = syrupData;
				if (name && undefined !== volume && undefined !== brix) {
					components.push({
						name,
						id: `${type}-${components.length}`,
						data: new SugarSyrup(volume, brix).data
					});
				}
				break;
			}
			default:
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				throw new Error(`Unknown component type: ${(data as any).type}`);
		}
	}

	return { liqueur, components };
}
