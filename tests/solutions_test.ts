import test from 'node:test';
import assert from 'node:assert';
import { isSpirit, isSyrup, newSpirit, Water } from '$lib';
import { solver } from '$lib/solver.js';

test('solve solves 80ABV', () => {
	const mixture = solver(newSpirit(250, 80), { abv: 30, brix: 20, volume: null });
	assert.deepEqual(mixture.analyze(0), {
		abv: 30,
		brix: 20,
		mass: 675,
		volume: 667
	});
	assert.deepEqual(mixture.findComponent(isSpirit)?.volume, 250, 'spirit volume');
	assert.deepEqual(mixture.findComponent((o) => o instanceof Water)?.volume, 332, 'water volume');
	assert.deepEqual(mixture.findComponent(isSyrup)?.equivalentSugarMass, 135, 'sugar mass');
});

test('solve solves 40ABV', () => {
	const mixture = solver(newSpirit(250, 40), { abv: 30, brix: 30, volume: null });
	assert.deepEqual(mixture.analyze(0), {
		abv: 30,
		brix: 30,
		mass: 351,
		volume: 333
	});

	assert.deepEqual(mixture.findComponent(isSpirit)?.volume, 250, 'spirit volume');
	assert.deepEqual(mixture.findComponent((o) => o instanceof Water)?.volume, 17, 'water volume');
	assert.deepEqual(mixture.findComponent(isSyrup)?.equivalentSugarMass, 105, 'sugar mass');
});

test('solve solves 10brix', () => {
	const mixture = solver(newSpirit(250, 40), { abv: 25, brix: 10, volume: null });
	assert.deepEqual(mixture.analyze(0), {
		abv: 25,
		brix: 10,
		mass: 393,
		volume: 400
	});
	assert.deepEqual(mixture.findComponent(isSpirit)?.volume, 250, 'spirit volume');
	assert.deepEqual(mixture.findComponent((o) => o instanceof Water)?.volume, 125, 'water volume');
	assert.deepEqual(mixture.findComponent(isSyrup)?.mass, 39, 'sugar mass');
});

test('solve solves with syrup', () => {
	const mixture = solver(newSpirit(250, 40), { abv: 25, brix: 20, volume: null });
	assert.deepEqual(mixture.analyze(0), {
		abv: 25,
		brix: 20,
		mass: 410,
		volume: 401
	});

	assert.deepEqual(mixture.alcoholVolume, 100, 'alcohol volume');
	assert.equal(mixture.volume, 400, 'total volume');
	assert.deepEqual(mixture.mass, 410, 'mass');
	assert.deepEqual(mixture.equivalentSugarMass, 82, 'sugar mass');
});

test('grapefruit', () => {
	const mixture = solver(newSpirit(900, 80), { abv: 40, brix: 10, volume: null });
	assert.deepEqual(
		{
			abv: Math.round(mixture.abv),
			brix: Math.round(mixture.brix),
			totalVolume: Math.round(mixture.volume),
			sugar: mixture.findComponent(isSyrup)?.equivalentSugarMass,
			water: mixture.findComponent((o) => o instanceof Water)?.volume,
			spirit: mixture.findComponent(isSpirit)?.volume
		},
		{
			abv: 30,
			brix: 15,
			spirit: 900,
			sugar: 357,
			totalVolume: 2401,
			water: 1276
		}
	);
});
