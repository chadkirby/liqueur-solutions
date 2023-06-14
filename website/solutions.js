const sugarDensity = 1.59;
const waterDensity = 1;
const alcoholDensity = 0.79;
export class Sugar {
    constructor(mass) {
        Object.defineProperty(this, "mass", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: mass
        });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'Sugar'
        });
        Object.defineProperty(this, "abv", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "brix", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 100
        });
        Object.defineProperty(this, "waterVolume", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "waterMass", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "alcoholVolume", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "alcoholMass", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
    }
    clone() {
        return new Sugar(this.mass);
    }
    get sugarVolume() {
        return this.mass / sugarDensity;
    }
    get volume() {
        return this.sugarVolume;
    }
    get sugarMass() {
        return this.mass;
    }
}
export class Water {
    constructor(volume) {
        Object.defineProperty(this, "volume", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: volume
        });
        Object.defineProperty(this, "abv", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "brix", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "sugarVolume", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "sugarMass", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "alcoholVolume", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "alcoholMass", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
    }
    clone() {
        return new Water(this.volume);
    }
    get waterVolume() {
        return this.volume;
    }
    get waterMass() {
        return this.waterVolume * waterDensity;
    }
    get mass() {
        return this.waterMass;
    }
}
export class Ethanol {
    constructor(volume) {
        Object.defineProperty(this, "volume", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: volume
        });
        Object.defineProperty(this, "abv", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 100
        });
        Object.defineProperty(this, "brix", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "sugarVolume", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "sugarMass", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "waterVolume", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "waterMass", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
    }
    clone() {
        return new Ethanol(this.volume);
    }
    get alcoholVolume() {
        return this.volume;
    }
    get alcoholMass() {
        return this.alcoholVolume * alcoholDensity;
    }
    get mass() {
        return this.alcoholMass;
    }
}
export class Mixture {
    constructor(components) {
        Object.defineProperty(this, "components", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: components
        });
    }
    clone() {
        return new Mixture(Object.fromEntries(Object.entries(this.components).map(([key, component]) => [
            key,
            component.clone(),
        ])));
    }
    get abv() {
        return 100 * this.alcoholVolume / this.volume;
    }
    get brix() {
        return 100 * this.sugarMass / this.mass;
    }
    get volume() {
        return this.sumComponents('volume');
    }
    get waterVolume() {
        return this.sumComponents('waterVolume');
    }
    get waterMass() {
        return this.sumComponents('waterMass');
    }
    get alcoholVolume() {
        return this.sumComponents('alcoholVolume');
    }
    get alcoholMass() {
        return this.sumComponents('alcoholMass');
    }
    get sugarVolume() {
        return this.sumComponents('sugarVolume');
    }
    get sugarMass() {
        return this.sumComponents('sugarMass');
    }
    get mass() {
        return this.sumComponents('mass');
    }
    sumComponents(key) {
        return Object.values(this.components).reduce((sum, component) => sum + component[key], 0);
    }
    analyze(precision = 0) {
        return {
            volume: round(this.volume, precision),
            mass: round(this.mass, precision),
            abv: round(this.abv, precision),
            brix: round(this.brix, precision),
        };
    }
}
function round(value, precision) {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
}
export class Syrup extends Mixture {
    constructor(brix, volume) {
        super({
            water: new Water(0),
            sugar: new Sugar(0),
        });
        Object.defineProperty(this, "_volume", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_brix", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._volume = volume;
        this._brix = brix;
        this.updateComponents();
    }
    clone() {
        return new Syrup(this._volume, this._brix);
    }
    updateComponents() {
        this.components.water = new Water(this._volume * (1 - this._brix / 100));
        this.components.sugar = new Sugar(this._volume * (this._brix / 100));
    }
    get volume() {
        return super.volume;
    }
    set volume(volume) {
        this._volume = volume;
        this.updateComponents();
    }
}
export class Spirit extends Mixture {
    constructor(volume, abv) {
        super({
            water: new Water(0),
            ethanol: new Ethanol(0),
        });
        Object.defineProperty(this, "_volume", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_abv", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._volume = volume;
        this._abv = abv;
        this.updateComponents();
    }
    clone() {
        return new Spirit(this._volume, this._abv);
    }
    updateComponents() {
        this.components.water = new Water(this._volume * (1 - this._abv / 100));
        this.components.ethanol = new Ethanol(this._volume * (this._abv / 100));
    }
    get volume() {
        return super.volume;
    }
    set volume(volume) {
        this._volume = volume;
        this.updateComponents();
    }
}
export function solve(sourceSpirit, targetAbv, targetBrix, sourceSweetenerBrix = 100) {
    if (targetAbv > sourceSpirit.abv) {
        throw new Error(`Target ABV (${targetAbv}) must be less than source ABV (${sourceSpirit.abv})`);
    }
    const volumeAtTargetAbv = sourceSpirit.alcoholVolume / (targetAbv / 100);
    const mixture = new Mixture({
        ethanol: sourceSpirit.components.ethanol.clone(),
        water: new Water(volumeAtTargetAbv * (1 - targetBrix / 100)),
        sugar: new Sugar(volumeAtTargetAbv * (targetBrix / 100)),
    });
    const components = mixture.components;
    let error = 1;
    let iterations = 1000;
    while (error > 0.01 && --iterations > 0) {
        const dError_dAbv = (targetAbv - mixture.abv) / 100;
        const dError_dBrix = (targetBrix - mixture.brix) / 100;
        const { volume, mass } = mixture;
        // is abv is below target, we need less water
        components.water.volume -= volume * dError_dAbv;
        // if brix is below target, we need more sugar
        components.sugar.mass *= 1 + dError_dBrix;
        // if brix is below target, we need less water
        components.water.volume -= mass * dError_dBrix;
        // Ensure component volumes and mass stay within the valid range
        components.ethanol.volume = Math.min(sourceSpirit.alcoholVolume, Math.max(0, components.ethanol.volume));
        components.water.volume = Math.max(0, components.water.volume);
        components.sugar.mass = Math.max(0, components.sugar.mass);
        error = Math.sqrt((mixture.abv - targetAbv) ** 2 + (mixture.brix - targetBrix) ** 2);
    }
    // now convert the volume of ethanol to an equivalent volume of spirit
    const targetSpirit = new Spirit(Math.round(mixture.alcoholVolume / (sourceSpirit.abv / 100)), sourceSpirit.abv);
    const targetSyrup = new Syrup(sourceSweetenerBrix, Math.round(100 * mixture.sugarMass / sourceSweetenerBrix));
    const targetWater = new Water(Math.round(mixture.waterVolume - targetSyrup.waterVolume - targetSpirit.waterVolume));
    const output = new Mixture({
        spirit: targetSpirit,
        syrup: targetSyrup,
        water: targetWater,
    });
    return {
        mixture: output,
        error,
        iterations: 1000 - iterations,
    };
}
