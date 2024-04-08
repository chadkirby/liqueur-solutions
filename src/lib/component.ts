import type { Target } from './solver.js';

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
	locked: AnyLockedValue;
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
	analyze(precision?: number): Target & {
		mass: number;
	};
	data: SpiritData | WaterData | SugarData | SyrupData;
	isValid: boolean;
	canEdit(key: ComponentNumberKeys): boolean;
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
	locked: Array<'volume' | 'abv'>;
};
export type WaterData = {
	readonly type: 'water';
	volume: number;
	locked: Array<'volume'>;
};
export type SugarData = {
	readonly type: 'sugar';
	mass: number;
	locked: Array<'mass'>;
};
export type SyrupData = {
	readonly type: 'syrup';
	volume: number;
	brix: number;
	locked: Array<'volume' | 'brix'>;
};

// Utility type to get writable keys
type WritableKeys<T> = {
	[P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, P>;
}[keyof T];

// Helper type to test if two types are equal
type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
	? 1
	: 2
	? A
	: B;

// Usage
export type WritableSpiritDataKeys = WritableKeys<SpiritData>; // "volume" | "abv" | "locked"
export type WritableWaterDataKeys = WritableKeys<WaterData>; // "volume" | "locked"
export type WritableSugarDataKeys = WritableKeys<SugarData>; // "mass" | "locked"
export type WritableSyrupDataKeys = WritableKeys<SyrupData>; // "volume" | "brix" | "locked"
export type AnyLockedValue =
	| SpiritData['locked']
	| WaterData['locked']
	| SugarData['locked']
	| SyrupData['locked'];

export function isSpiritLocked(input: unknown): input is SpiritData['locked'] {
	return Array.isArray(input) && input.every((item) => ['volume', 'abv'].includes(item));
}
export function isWaterLocked(input: unknown): input is WaterData['locked'] {
	return Array.isArray(input) && input.every((item) => ['volume'].includes(item));
}
export function isSugarLocked(input: unknown): input is SugarData['locked'] {
	return Array.isArray(input) && input.every((item) => ['mass'].includes(item));
}
export function isSyrupLocked(input: unknown): input is SyrupData['locked'] {
	return Array.isArray(input) && input.every((item) => ['volume', 'brix'].includes(item));
}
export function isLockedValue(input: unknown): input is AnyLockedValue {
	return (
		isSpiritLocked(input) || isWaterLocked(input) || isSugarLocked(input) || isSyrupLocked(input)
	);
}

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
