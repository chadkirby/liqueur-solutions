export * from './mixture.js';
export { Sweetener } from './components/sweetener.js';
export { Water } from './components/water.js';
export { Ethanol } from './components/ethanol.js';
export {
	isSweetenerData,
	isMixtureData,
	isEthanolData,
	isWaterData,
	type SerializedComponent,
	SweetenerTypes
} from './components/index.js';
export type {
	Component,
	MixtureData,
	EthanolData as SpiritData,
	SweetenerData as SugarData,
	WaterData
} from './components/index.js';
export { deserialize } from './deserialize.js';
