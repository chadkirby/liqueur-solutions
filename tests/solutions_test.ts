import test from 'node:test';
import assert from 'node:assert';
import { Spirit, Syrup, Water } from '$lib';
import { solver } from '$lib/solver.js';

test('solve solves 80ABV', () => {
	const mixture = solver(new Spirit(250, 80), { abv: 30, brix: 20, volume: null });
	assert.deepEqual(mixture.analyze(0), {
		abv: 30,
		brix: 20,
		mass: 675,
		volume: 667
	});
	assert.deepEqual(mixture.findByType(Spirit.is)?.volume, 250, 'spirit volume');
	assert.deepEqual(mixture.findByType(Water.is)?.volume, 332, 'water volume');
	assert.deepEqual(mixture.findByType(Syrup.is)?.sugarMass, 135, 'sugar mass');
});

test('solve solves 40ABV', () => {
	const mixture = solver(new Spirit(250, 40), { abv: 30, brix: 30, volume: null });
	assert.deepEqual(mixture.analyze(0), {
		abv: 30,
		brix: 30,
		mass: 351,
		volume: 333
	});

	assert.deepEqual(mixture.findByType(Spirit.is)?.volume, 250, 'spirit volume');
	assert.deepEqual(mixture.findByType(Water.is)?.volume, 17, 'water volume');
	assert.deepEqual(mixture.findByType(Syrup.is)?.sugarMass, 105, 'sugar mass');
});

test('solve solves 10brix', () => {
	const mixture = solver(new Spirit(250, 40), { abv: 25, brix: 10, volume: null });
	assert.deepEqual(mixture.analyze(0), {
		abv: 25,
		brix: 10,
		mass: 393,
		volume: 400
	});
	assert.deepEqual(mixture.findByType(Spirit.is)?.volume, 250, 'spirit volume');
	assert.deepEqual(mixture.findByType(Water.is)?.volume, 125, 'water volume');
	assert.deepEqual(mixture.findByType(Syrup.is)?.mass, 39, 'sugar mass');
});

test('solve solves with syrup', () => {
	const mixture = solver(new Spirit(250, 40), { abv: 25, brix: 20, volume: null });
	assert.deepEqual(mixture.analyze(0), {
		abv: 25,
		brix: 20,
		mass: 410,
		volume: 401
	});

	assert.deepEqual(mixture.alcoholVolume, 100, 'alcohol volume');
	assert.equal(mixture.volume, 400, 'total volume');
	assert.deepEqual(mixture.mass, 410, 'mass');
	assert.deepEqual(mixture.sugarMass, 82, 'sugar mass');
});

test('grapefruit', () => {
	const mixture = solver(new Spirit(900, 80), { abv: 40, brix: 10, volume: null });
	assert.deepEqual(
		{
			abv: Math.round(mixture.abv),
			brix: Math.round(mixture.brix),
			totalVolume: Math.round(mixture.volume),
			sugar: mixture.findByType(Syrup.is)?.sugarMass,
			water: mixture.findByType(Water.is)?.volume,
			spirit: mixture.findByType(Spirit.is)?.volume
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
