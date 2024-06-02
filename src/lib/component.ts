import { getKcal, analyze, type Analysis } from './utils.js';

const ComponentValueKeys = ['abv', 'brix', 'volume', 'mass'] as const;
export type ComponentValueKeys = (typeof ComponentValueKeys)[number];

export function isComponentValueKey(key: string): key is ComponentValueKeys {
	return ComponentValueKeys.includes(key as ComponentValueKeys);
}

const ComponentTypes = ['spirit', 'water', 'sugar', 'syrup'] as const;
type ComponentTypes = (typeof ComponentTypes)[number];
export interface BaseComponentData {
	type: ComponentTypes;
	abv: number;
	brix: number;
	volume: number;
	mass: number;
}

export function isComponentType(type: string): type is ComponentTypes {
	return ComponentTypes.includes(type as ComponentTypes);
}

export interface ComponentData extends BaseComponentData {
	sugarVolume: number;
	waterVolume: number;
	alcoholVolume: number;
	sugarMass: number;
	waterMass: number;
	alcoholMass: number;
}

export interface Component extends ComponentData {
	clone(): Component;
	analyze(precision?: number): Analysis;
	data: SpiritData | WaterData | SugarData | SyrupData;
	isValid: boolean;
	canEdit(key: ComponentNumberKeys | string): boolean;
	kcal: number;
}

export abstract class BaseComponent {
	abstract sugarMass: number;
	abstract alcoholMass: number;
	abstract abv: number;
	abstract brix: number;
	abstract volume: number;
	abstract mass: number;
	get kcal() {
		return getKcal(this);
	}

	get proof() {
		return this.abv * 2;
	}

	analyze(precision = 0): Analysis {
		return analyze(this, precision);
	}
}

export type NumberKeys<T> = {
	[K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

// get all the numeric keys of ComponentData
export type ComponentNumberKeys = NumberKeys<ComponentData>;

export type SpiritData = {
	readonly type: 'spirit';
	volume: number;
	abv: number;
};
export type WaterData = {
	readonly type: 'water';
	volume: number;
};
export type SugarData = {
	readonly type: 'sugar';
	mass: number;
};
export type SyrupData = {
	readonly type: 'syrup';
	volume: number;
	brix: number;
};

// Utility type to get writable keys
type WritableKeys<T> = {
	[P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, P>;
}[keyof T];

// Helper type to test if two types are equal
type IfEquals<X, Y, A = X, B = never> =
	(<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

// Usage
export type WritableSpiritDataKeys = WritableKeys<SpiritData>; // "volume" | "abv"
export type WritableWaterDataKeys = WritableKeys<WaterData>; // "volume"
export type WritableSugarDataKeys = WritableKeys<SugarData>; // "mass"
export type WritableSyrupDataKeys = WritableKeys<SyrupData>; // "volume" | "brix"

export function checkData(type: 'spirit', input: unknown): input is SpiritData;
export function checkData(type: 'water', input: unknown): input is WaterData;
export function checkData(type: 'sugar', input: unknown): input is SugarData;
export function checkData(type: 'syrup', input: unknown): input is SyrupData;
export function checkData(
	type: ComponentTypes,
	input: unknown
): input is SpiritData | WaterData | SugarData | SyrupData {
	if (typeof input !== 'object' || input === null) return false;
	const data = input as SpiritData | WaterData | SugarData | SyrupData;
	if (data.type !== type) return false;
	switch (type) {
		case 'spirit':
			return (
				typeof (data as SpiritData).volume === 'number' &&
				typeof (data as SpiritData).abv === 'number'
			);
		case 'water':
			return typeof (data as WaterData).volume === 'number';
		case 'sugar':
			return typeof (data as SugarData).mass === 'number';
		case 'syrup':
			return (
				typeof (data as SyrupData).volume === 'number' &&
				typeof (data as SyrupData).brix === 'number'
			);
	}
}

export function isSpiritData(data: unknown): data is SpiritData {
	return checkData('spirit', data);
}
export function isWaterData(data: unknown): data is WaterData {
	return checkData('water', data);
}
export function isSugarData(data: unknown): data is SugarData {
	return checkData('sugar', data);
}
export function isSyrupData(data: unknown): data is SyrupData {
	return checkData('syrup', data);
}

export type SerializedComponent = {
	name: string;
	id: string;
	data: SpiritData | WaterData | SugarData | SyrupData;
};
