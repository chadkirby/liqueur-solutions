import type { Target } from "./solver.js";

const ComponentValueKeys = ['abv', 'brix', 'volume', 'mass'] as const;
type ComponentValueKeys = (typeof ComponentValueKeys)[number];

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

// get all the numeric keys of ComponentData
export type ComponentNumberKeys = {
	[K in keyof ComponentData]: ComponentData[K] extends number ? K : never;
}[keyof ComponentData];

export type SpiritData = {
	type: 'spirit';
	volume: number;
	abv: number;
};
export type WaterData = {
	type: 'water';
	volume: number;
};
export type SugarData = {
	type: 'sugar';
	mass: number;
};
export type SyrupData = {
	type: 'syrup';
	volume: number;
	brix: number;
};

export interface Component extends ComponentData {
	clone(): Component;
	analyze(precision?: number): Target & {
		mass: number;
	};
	data: SpiritData | WaterData | SugarData | SyrupData;
	isValid: boolean;
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
