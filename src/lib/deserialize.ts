import { isComponentValueKey, type BaseComponentData, type Component, isComponentType } from "./component.js";
import { Mixture } from "./mixture.js";
import { Spirit } from "./spirit.js";
import { Sugar } from "./sugar.js";
import { Syrup } from "./syrup.js";
import { Water } from "./water.js";

export function deserialize(qs: string | URLSearchParams) {
  const params = typeof qs === 'string' ? new URLSearchParams(qs) : qs;
  const components: Record<string, Component> = {};
  const working: Partial<BaseComponentData & { name: string; type: string }>[] = [];
  for (const [key, value] of params) {
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
      case 'spirit': {
        const { volume, abv, name } = values;
        if (name && undefined !== volume && undefined !== abv) {
          components[name] = new Spirit(volume, abv);
        }
        break;
      }
      case 'water': {
        const { volume, name } = values;
        if (name && undefined !== volume) {
          components[name] = new Water(volume);
        }
        break;
      }
      case 'sugar': {
        const { mass, name } = values;
        if (name && undefined !== mass) {
          components[name] = new Sugar(mass);
        }
        break;
      }
      case 'syrup': {
        const { volume, brix, name } = values;
        if (name && undefined !== volume && undefined !== brix) {
          components[name] = new Syrup(volume, brix);
        }
        break;
      }
      default:
        throw new Error(`Unknown component type: ${type}`);
    }
  }

  return new Mixture(components);
}
