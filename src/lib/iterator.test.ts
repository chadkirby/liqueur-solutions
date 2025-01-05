import { test, assert, describe } from 'vitest';
import { FancyIterator } from './iterator.js';

describe('iterator', () => {
	test('iterator works', () => {
		const map = new Map<string, number>([
			['foo', 1],
			['bar', 2],
		]);
		assert.equal(
			new FancyIterator(map.keys()).find((key) => key === 'foo'),
			'foo',
		);
		assert.deepEqual([...new FancyIterator(map.keys())], ['foo', 'bar']);
	});

	test('iterator works with arrays', () => {
		const arr = ['foo', 'bar'];
		assert.equal(
			new FancyIterator(arr).find((key) => key === 'foo'),
			'foo',
		);
		assert.deepEqual([...new FancyIterator(arr)], ['foo', 'bar']);
	});

	test('iterator maps', () => {
		const arr = ['foo', 'bar'];
		assert.deepEqual(
			new FancyIterator(arr).map((key) => key.toUpperCase()),
			['FOO', 'BAR'],
		);
	});

	test('iterator filters', () => {
		const arr = ['foo', 'bar'];
		assert.deepEqual(
			new FancyIterator(arr).filter((key) => key === 'foo'),
			['foo'],
		);
	});

	test('iterator every', () => {
		const arr = ['foo', 'bar'];
		assert.equal(
			new FancyIterator(arr).every((key) => key.length === 3),
			true,
		);
		assert.equal(
			new FancyIterator(arr).every((key) => key.length === 4),
			false,
		);
	});

	test('iterator some', () => {
		const arr = ['foo', 'bar'];
		assert.equal(
			new FancyIterator(arr).some((key) => key.length === 3),
			true,
		);
		assert.equal(
			new FancyIterator(arr).some((key) => key.length === 4),
			false,
		);
	});
});
