import { analyze, type Analysis } from '../utils.js';

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
export type SweetenerTypes = (typeof SweetenerTypes)[number];

const ComponentTypes = ['water', 'ethanol', 'sweetener', 'mixture'] as const;

interface Data {
	readonly type: ComponentTypes;
}

export interface EthanolData extends Data {
	readonly type: 'ethanol';
	volume: number;
}
export interface WaterData extends Data {
	readonly type: 'water';
	volume: number;
}
export interface SweetenerData extends Data {
	readonly type: 'sweetener';
	readonly subType: SweetenerTypes;
	mass: number;
}
export interface MixtureData extends Data {
	readonly type: 'mixture';
	components: Array<{ name: string; id: string; data: AnyData }>;
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
export type AnyData = EthanolData | WaterData | SweetenerData | MixtureData;

export function isComponentType(type: string): type is ComponentTypes {
	return ComponentTypes.includes(type as ComponentTypes);
}

export interface Component {
	clone(): Component;
	analyze(precision?: number): Analysis;
	data: AnyData;
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

	equivalentSugarMass: number;
}

export abstract class BaseComponent {
	abstract equivalentSugarMass: number;
	abstract alcoholMass: number;
	abstract abv: number;
	abstract brix: number;
	abstract volume: number;
	abstract mass: number;
	abstract kcal: number;

	abstract describe(): string;

	abstract setVolume(volume: number): void;
	abstract setEquivalentSugarMass(mass: number): void;

	get proof() {
		return this.abv * 2;
	}

	analyze(precision = 0): Analysis {
		return analyze(this, precision);
	}

	abstract canEdit(key: ComponentNumberKeys | string): boolean;
	abstract data: AnyData;
}

export type NumberKeys<T> = {
	[K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

export type ComponentNumberKeys = NumberKeys<Component>;

export function checkData(type: 'water', input: unknown): input is WaterData;
export function checkData(type: 'sweetener', input: unknown): input is SweetenerData;
export function checkData(type: 'mixture', input: unknown): input is MixtureData;
export function checkData(type: ComponentTypes, input: unknown): input is AnyData;
export function checkData(type: ComponentTypes, input: unknown): input is AnyData {
	if (typeof input !== 'object' || input === null) return false;
	const data = input as AnyData;
	if (data.type !== type) return false;
	switch (type) {
		case 'ethanol':
			return typeof (data as EthanolData).volume === 'number';
		case 'water':
			return typeof (data as WaterData).volume === 'number';
		case 'sweetener':
			return (
				typeof (data as SweetenerData).mass === 'number' &&
				SweetenerTypes.includes((data as SweetenerData).subType)
			);
		case 'mixture': {
			const mixtureData = data as MixtureData;
			return (
				Array.isArray(mixtureData.components) &&
				mixtureData.components.every(({ data }) => checkData(data.type, data))
			);
		}
	}
}

export function isEthanolData(data: unknown): data is EthanolData {
	return checkData('ethanol', data);
}
export function isWaterData(data: unknown): data is WaterData {
	return checkData('water', data);
}
export function isSweetenerData(data: unknown): data is SweetenerData {
	return checkData('sweetener', data);
}
export function isMixtureData(data: unknown): data is MixtureData {
	return checkData('mixture', data);
}

export type SerializedComponent = {
	name: string;
	id: string;
	data: AnyData;
};
