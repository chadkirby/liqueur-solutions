import { describe, it, expect } from 'vitest';
import {
	getIdPrefix,
	citrusJuiceNames,
	makeCitrusPrefix,
	makeCitrusId,
	getCitrusPrefix,
	CitrusId,
	getCitrusDissociationFactor,
} from './citrus-ids';

describe('prefix handling', () => {
	it('should extract generic prefixes', () => {
		expect(getIdPrefix('__test__123')).toBe('__test__');
		expect(getIdPrefix('no-prefix')).toBeNull();
	});

	it('should make valid citrus prefixes', () => {
		citrusJuiceNames.forEach((name) => {
			const prefix = makeCitrusPrefix(name);
			expect(prefix).toMatch(/^__citrus-\w+__$/);
			expect(prefix).toContain(name);
		});
	});

	it('should extract citrus prefixes', () => {
		expect(getCitrusPrefix('__citrus-lemon__123')).toBe('__citrus-lemon__');
		expect(getCitrusPrefix('__citrus-lime__abc')).toBe('__citrus-lime__');
		expect(getCitrusPrefix('__other__123')).toBeNull();
	});
});

describe('CitrusId class', () => {
	it('should generate valid citrus IDs', () => {
		const lemonId = new CitrusId('lemon');
		expect(lemonId.toString()).toMatch(/^__citrus-lemon__.+/);
		expect(lemonId.citrusName).toBe('lemon');
	});

	it('should accept custom IDs', () => {
		const customId = new CitrusId('orange', 'test123');
		expect(customId.toString()).toBe('__citrus-orange__test123');
	});
});

describe('makeCitrusId', () => {
	it('should generate unique IDs for each citrus type', () => {
		const ids = new Set(citrusJuiceNames.map((name) => makeCitrusId(name)));
		expect(ids.size).toBe(citrusJuiceNames.length);
	});
});

describe('dissociation factors', () => {
	it('should return correct dissociation factors', () => {
		expect(getCitrusDissociationFactor('__citrus-lemon__123')).toBeCloseTo(0.9057, 4);
		expect(getCitrusDissociationFactor('__citrus-lime__456')).toBeCloseTo(0.93828, 4);
		expect(getCitrusDissociationFactor('__citrus-orange__789')).toBeCloseTo(0.99157, 4);
		expect(getCitrusDissociationFactor('__citrus-grapefruit__abc')).toBeCloseTo(0.9924, 4);
	});

	it('should handle invalid IDs', () => {
		expect(getCitrusDissociationFactor('invalid')).toBe(0);
		expect(getCitrusDissociationFactor('__other__123')).toBe(0);
	});
});
