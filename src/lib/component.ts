import { analyze, type Analysis } from './utils.js';

const NumericDataValueKeys = ['abv', 'brix', 'volume', 'mass'] as const;
export type ComponentValueKeys = (typeof NumericDataValueKeys)[number];

export function isNumericDataValueKey(key: string): key is ComponentValueKeys {
	return NumericDataValueKeys.includes(key as ComponentValueKeys);
}

export const SweetenerTypes = [
	'sucrose',
	'fructose',
	'allulose',
	'erythritol',
	'sucralose'
] as const;

const ComponentTypes = ['spirit', 'water', 'sugar-syrup', 'sweetener'] as const;

interface Data {
	readonly type: ComponentTypes;
}

export interface SpiritData extends Data {
	readonly type: 'spirit';
	volume: number;
	abv: number;
}
export interface WaterData extends Data {
	readonly type: 'water';
	volume: number;
}
export interface SweetenerData extends Data {
	readonly type: 'sweetener';
	readonly subType: (typeof SweetenerTypes)[number];
	mass: number;
}
export interface SyrupData extends Data {
	readonly type: 'sugar-syrup';
	volume: number;
	brix: number;
}

export interface SugarData extends SweetenerData {
	readonly subType: 'sucrose';
}
export interface FructoseData extends SweetenerData {
	readonly subType: 'fructose';
}
export interface AlluloseData extends SweetenerData {
	readonly subType: 'allulose';
}
export interface ErythritolData extends SweetenerData {
	readonly subType: 'erythritol';
}
export interface SucraloseData extends SweetenerData {
	readonly subType: 'sucralose';
}

type ComponentTypes = (typeof ComponentTypes)[number];
export type AnyData = SpiritData | WaterData | SweetenerData | SyrupData;

export function isComponentType(type: string): type is ComponentTypes {
	return ComponentTypes.includes(type as ComponentTypes);
}

export interface Component {
	clone(): Component;
	analyze(precision?: number): Analysis;
	data: SpiritData | WaterData | SweetenerData | SyrupData;
	isValid: boolean;
	canEdit(key: ComponentNumberKeys | string): boolean;
	kcal: number;

	abv: number;
	brix: number;
	volume: number;
	mass: number;

	waterVolume: number;
	waterMass: number;

	alcoholVolume: number;
	alcoholMass: number;

	sugarVolume: number;
	sugarMass: number;
}

export abstract class BaseComponent {
	abstract sugarMass: number;
	abstract alcoholMass: number;
	abstract abv: number;
	abstract brix: number;
	abstract volume: number;
	abstract mass: number;
	abstract kcal: number;

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

export type ComponentNumberKeys = NumberKeys<Component>;

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
export type WritableSugarDataKeys = WritableKeys<SweetenerData>; // "mass"
export type WritableSyrupDataKeys = WritableKeys<SyrupData>; // "volume" | "brix"

export function checkData(type: 'spirit', input: unknown): input is SpiritData;
export function checkData(type: 'water', input: unknown): input is WaterData;
export function checkData(type: 'sweetener', input: unknown): input is SweetenerData;
export function checkData(type: 'sugar-syrup', input: unknown): input is SyrupData;
export function checkData(
	type: ComponentTypes,
	input: unknown
): input is SpiritData | WaterData | SweetenerData | SyrupData {
	if (typeof input !== 'object' || input === null) return false;
	const data = input as SpiritData | WaterData | SweetenerData | SyrupData;
	if (data.type !== type) return false;
	switch (type) {
		case 'spirit':
			return (
				typeof (data as SpiritData).volume === 'number' &&
				typeof (data as SpiritData).abv === 'number'
			);
		case 'water':
			return typeof (data as WaterData).volume === 'number';
		case 'sweetener':
			return (
				typeof (data as SweetenerData).mass === 'number' &&
				SweetenerTypes.includes((data as SweetenerData).subType)
			);
		case 'sugar-syrup':
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
export function isSweetenerData(data: unknown): data is SweetenerData {
	return checkData('sweetener', data);
}
export function isSyrupData(data: unknown): data is SyrupData {
	return checkData('sugar-syrup', data);
}

export type SerializedComponent = {
	name: string;
	id: string;
	data: SpiritData | WaterData | SweetenerData | SyrupData;
};
