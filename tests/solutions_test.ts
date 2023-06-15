import test from 'tape';
import { solve, Spirit } from '../src/solutions.js';

test('solve solves 80ABV', (assert) => {
  const { mixture, iterations } = solve(new Spirit(250, 80), 30, 20);
  assert.deepEqual(
    mixture.analyze(0),
    {
      abv: 30,
      brix: 20,
      mass: 675,
      volume: 667,
    },
  );
  assert.deepEqual(
    iterations,
    47,
  );
  assert.deepEqual(
    mixture.components.spirit.volume,
    250,
    'spirit volume',
  );
  assert.deepEqual(
    mixture.components.water.volume,
    332,
    'water volume',
  );
  assert.deepEqual(
    mixture.components.syrup.sugarMass,
    135,
    'sugar mass',
  );
});

test('solve solves 40ABV', (assert) => {
  const { mixture, iterations } = solve(new Spirit(250, 40), 30, 30);
  assert.deepEqual(
    mixture.analyze(0),
    {
      abv: 30,
      brix: 30,
      mass: 351,
      volume: 333,
    },
  );
  assert.deepEqual(
    iterations,
    36,
  );
  assert.deepEqual(
    mixture.components.spirit.volume,
    250,
    'spirit volume',
  );
  assert.deepEqual(
    mixture.components.water.volume,
    17,
    'water volume',
  );
  assert.deepEqual(
    mixture.components.syrup.sugarMass,
    105,
    'sugar mass',
  );
});

test('solve solves 10brix', (assert) => {
  const { mixture, iterations } = solve(new Spirit(250, 40), 25, 10);
  assert.deepEqual(
    mixture.analyze(0),
    {
      abv: 25,
      brix: 10,
      mass: 393,
      volume: 400,
    },
  );
  assert.deepEqual(
    iterations,
    66,
  );
  assert.deepEqual(
    mixture.components.spirit.volume,
    250,
    'spirit volume',
  );
  assert.deepEqual(
    mixture.components.water.volume,
    125,
    'water volume',
  );
  assert.deepEqual(
    mixture.components.syrup.mass,
    39,
    'sugar mass',
  );
});

test('solve solves with syrup', (assert) => {
  const { mixture } = solve(new Spirit(250, 40), 25, 20, 50);
  assert.deepEqual(
    mixture.analyze(0),
    {
      abv: 25,
      brix: 20,
      mass: 410,
      volume: 401,
    },
  );

  assert.deepEqual(
    mixture.alcoholVolume,
    100,
    'alcohol volume',
  );
  assert.equals(
    mixture.volume,
    400,
    'total volume',
  );
  assert.deepEqual(
    mixture.mass,
    410,
    'mass',
  );
  assert.deepEqual(
    mixture.sugarMass,
    82,
    'sugar mass',
  );
});

test('grapefruit', (assert) => {
  const { mixture } = solve(new Spirit(900, 80), 40, 10);
  assert.deepEqual(
    {
      abv: Math.round(mixture.abv),
      brix: Math.round(mixture.brix),
      totalVolume: Math.round(mixture.volume),
      sugar: mixture.components.syrup.sugarMass,
      water: mixture.components.water.volume,
      spirit: mixture.components.spirit.volume,
    },
    {
      abv: 30,
      brix: 15,
      spirit: 900,
      sugar: 357,
      totalVolume: 2401,
      water: 1276,
    },
  );
});
