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
export declare class Sugar implements Component {
    mass: number;
    readonly name = "Sugar";
    readonly abv = 0;
    readonly brix = 100;
    readonly waterVolume = 0;
    readonly waterMass = 0;
    readonly alcoholVolume = 0;
    readonly alcoholMass = 0;
    constructor(mass: number);
    clone(): Sugar;
    get sugarVolume(): number;
    get volume(): number;
    get sugarMass(): number;
}
export declare class Water implements Component {
    volume: number;
    readonly abv = 0;
    readonly brix = 0;
    readonly sugarVolume = 0;
    readonly sugarMass = 0;
    readonly alcoholVolume = 0;
    readonly alcoholMass = 0;
    constructor(volume: number);
    clone(): Water;
    get waterVolume(): number;
    get waterMass(): number;
    get mass(): number;
}
export declare class Ethanol implements Component {
    volume: number;
    readonly abv = 100;
    readonly brix = 0;
    readonly sugarVolume = 0;
    readonly sugarMass = 0;
    readonly waterVolume = 0;
    readonly waterMass = 0;
    constructor(volume: number);
    clone(): Ethanol;
    get alcoholVolume(): number;
    get alcoholMass(): number;
    get mass(): number;
}
export declare class Mixture<T extends Record<string, Component>> implements Component {
    readonly components: T;
    constructor(components: T);
    clone(): Mixture<T>;
    get abv(): number;
    get brix(): number;
    get volume(): number;
    get waterVolume(): number;
    get waterMass(): number;
    get alcoholVolume(): number;
    get alcoholMass(): number;
    get sugarVolume(): number;
    get sugarMass(): number;
    get mass(): number;
    private sumComponents;
    analyze(precision?: number): Target & {
        mass: number;
    };
}
export declare class Syrup extends Mixture<{
    water: Water;
    sugar: Sugar;
}> {
    private _volume;
    private _brix;
    constructor(brix: number, volume: number);
    clone(): Syrup;
    updateComponents(): void;
    get volume(): number;
    set volume(volume: number);
}
export declare class Spirit extends Mixture<{
    water: Water;
    ethanol: Ethanol;
}> {
    private _volume;
    private _abv;
    constructor(volume: number, abv: number);
    clone(): Spirit;
    updateComponents(): void;
    get volume(): number;
    set volume(volume: number);
}
export interface Target {
    abv: number;
    brix: number;
    volume: number;
}
export declare function solve(sourceSpirit: Spirit, targetAbv: number, targetBrix: number, sourceSweetenerBrix?: number): {
    mixture: Mixture<{
        spirit: Spirit;
        syrup: Syrup;
        water: Water;
    }>;
    error: number;
    iterations: number;
};
export {};
