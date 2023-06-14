interface ComponentData {
  abv: number;
  brix: number;
  volume: number;
  mass: number;
  sugarVolume: number;
  waterVolume: number;
  alcoholVolume: number;
  sugarMass: number;
  waterMass: number;
  alcoholMass: number;
}

interface Component extends ComponentData {
  clone(): Component;
}

const sugarDensity = 1.59;
const waterDensity = 1;
const alcoholDensity = 0.79;

export class Sugar implements Component {
  readonly name = 'Sugar';
  readonly abv = 0;
  readonly brix = 100;
  readonly waterVolume = 0;
  readonly waterMass = 0;
  readonly alcoholVolume = 0;
  readonly alcoholMass = 0;

  constructor(public mass: number) {}
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

export class Water implements Component {
  readonly abv = 0;
  readonly brix = 0;
  readonly sugarVolume = 0;
  readonly sugarMass = 0;
  readonly alcoholVolume = 0;
  readonly alcoholMass = 0;

  constructor(public volume: number) {}
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

export class Ethanol implements Component {
  readonly abv = 100;
  readonly brix = 0;
  readonly sugarVolume = 0;
  readonly sugarMass = 0;
  readonly waterVolume = 0;
  readonly waterMass = 0;

  constructor(public volume: number) {}
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

export class Mixture<T extends Record<string, Component>> implements Component {
  constructor(
    readonly components: T,
  ) {
  }

  clone() {
    return new Mixture<T>(
      Object.fromEntries(
        Object.entries(this.components).map(([key, component]) => [
          key,
          component.clone(),
        ]),
      ) as T,
    );
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

  private sumComponents(key: keyof ComponentData): number {
    return Object.values(this.components).reduce(
      (sum, component) => sum + component[key],
      0,
    );
  }

  analyze(precision = 0): Target & {
    mass: number;
  } {
    return {
      volume: round(this.volume, precision),
      mass: round(this.mass, precision),
      abv: round(this.abv, precision),
      brix: round(this.brix, precision),
    };
  }
}

function round(value: number, precision: number) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export class Syrup extends Mixture<{ water: Water; sugar: Sugar }> {
  private _volume: number;
  private _brix: number;
  constructor(
    brix: number,
    volume: number,
  ) {
    super({
      water: new Water(0),
      sugar: new Sugar(0),
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

  set volume(volume: number) {
    this._volume = volume;
    this.updateComponents();
  }
}

export class Spirit extends Mixture<{ water: Water; ethanol: Ethanol }> {
  private _volume: number;
  private _abv: number;
  constructor(
    volume: number,
    abv: number,
  ) {
    super({
      water: new Water(0),
      ethanol: new Ethanol(0),
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

  set volume(volume: number) {
    this._volume = volume;
    this.updateComponents();
  }
}

export interface Target {
  abv: number;
  brix: number;
  volume: number;
}

export function solve(
  sourceSpirit: Spirit,
  targetAbv: number,
  targetBrix: number,
  sourceSweetenerBrix = 100, // pure sugar
) {
  if (targetAbv > sourceSpirit.abv) {
    throw new Error(
      `Target ABV (${targetAbv}) must be less than source ABV (${sourceSpirit.abv})`,
    );
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
    components.ethanol.volume = Math.min(
      sourceSpirit.alcoholVolume,
      Math.max(0, components.ethanol.volume),
    );
    components.water.volume = Math.max(0, components.water.volume);
    components.sugar.mass = Math.max(0, components.sugar.mass);

    error = Math.sqrt(
      (mixture.abv - targetAbv) ** 2 + (mixture.brix - targetBrix) ** 2,
    );
  }

  // now convert the volume of ethanol to an equivalent volume of spirit
  const targetSpirit = new Spirit(
    Math.round(mixture.alcoholVolume / (sourceSpirit.abv / 100)),
    sourceSpirit.abv,
  );
  const targetSyrup = new Syrup(
    sourceSweetenerBrix,
    Math.round(100 * mixture.sugarMass / sourceSweetenerBrix),
  );
  const targetWater = new Water(
    Math.round(
      mixture.waterVolume - targetSyrup.waterVolume - targetSpirit.waterVolume,
    ),
  );

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
