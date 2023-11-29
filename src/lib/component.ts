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
	locked: LockedString;
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

// get all the numeric keys of ComponentData
export type ComponentNumberKeys = {
	[K in keyof ComponentData]: ComponentData[K] extends number ? K : never;
}[keyof ComponentData];

export type SpiritData = {
	type: 'spirit';
	volume: number;
	abv: number;
	locked: 'volume' | 'abv' | 'volume+abv' | 'none';
};
export type WaterData = {
	type: 'water';
	volume: number;
	locked: 'volume' | 'none';
};
export type SugarData = {
	type: 'sugar';
	mass: number;
	locked: 'mass' | 'none';
};
export type SyrupData = {
	type: 'syrup';
	volume: number;
	brix: number;
	locked: 'volume' | 'brix' | 'volume+brix' | 'none';
};

export type LockedString =
	| SpiritData['locked']
	| WaterData['locked']
	| SugarData['locked']
	| SyrupData['locked'];

export function isSpiritLocked(input: unknown): input is SpiritData['locked'] {
	return typeof input === 'string' && ['volume', 'abv', 'volume+abv', 'none'].includes(input);
}
export function isWaterLocked(input: unknown): input is WaterData['locked'] {
	return typeof input === 'string' && ['volume', 'none'].includes(input);
}
export function isSugarLocked(input: unknown): input is SugarData['locked'] {
	return typeof input === 'string' && ['mass', 'none'].includes(input);
}
export function isSyrupLocked(input: unknown): input is SyrupData['locked'] {
	return typeof input === 'string' && ['volume', 'brix', 'volume+brix', 'none'].includes(input);
}
export function isLockedString(input: unknown): input is LockedString {
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
