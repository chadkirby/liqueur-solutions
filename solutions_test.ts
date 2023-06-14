import { assertAlmostEquals, assertEquals } from 'std/testing/asserts.ts';
import { solve, Spirit } from './solutions.ts';

Deno.test('solve solves 80ABV', () => {
  const { mixture, iterations } = solve(new Spirit(250, 80), 30, 20);
  assertEquals(
    mixture.analyze(0),
    {
      abv: 30,
      brix: 20,
      mass: 675,
      volume: 667,
    },
  );
  assertEquals(
    iterations,
    47,
  );
  assertEquals(
    mixture.components.spirit.volume,
    250,
    'spirit volume',
  );
  assertEquals(
    mixture.components.water.volume,
    332,
    'water volume',
  );
  assertEquals(
    mixture.components.syrup.sugarMass,
    135,
    'sugar mass',
  );
});

Deno.test('solve solves 40ABV', () => {
  const { mixture, iterations } = solve(new Spirit(250, 40), 30, 30);
  assertEquals(
    mixture.analyze(0),
    {
      abv: 30,
      brix: 30,
      mass: 351,
      volume: 333,
    },
  );
  assertEquals(
    iterations,
    36,
  );
  assertEquals(
    mixture.components.spirit.volume,
    250,
    'spirit volume',
  );
  assertEquals(
    mixture.components.water.volume,
    17,
    'water volume',
  );
  assertEquals(
    mixture.components.syrup.sugarMass,
    105,
    'sugar mass',
  );
});

Deno.test('solve solves 10brix', () => {
  const { mixture, iterations } = solve(new Spirit(250, 40), 25, 10);
  assertEquals(
    mixture.analyze(0),
    {
      abv: 25,
      brix: 10,
      mass: 393,
      volume: 400,
    },
  );
  assertEquals(
    iterations,
    66,
  );
  assertEquals(
    mixture.components.spirit.volume,
    250,
    'spirit volume',
  );
  assertEquals(
    mixture.components.water.volume,
    125,
    'water volume',
  );
  assertEquals(
    mixture.components.syrup.mass,
    39,
    'sugar mass',
  );
});

Deno.test('solve solves with syrup', () => {
  const { mixture } = solve(new Spirit(250, 40), 25, 20, 50);
  assertEquals(
    mixture.analyze(0),
    {
      abv: 25,
      brix: 20,
      mass: 410,
      volume: 401,
    },
  );

  assertEquals(
    mixture.alcoholVolume,
    100,
    'alcohol volume',
  );
  assertAlmostEquals(
    (mixture.volume),
    400,
    1,
    'total volume',
  );
  assertEquals(
    mixture.mass,
    410,
    'mass',
  );
  assertEquals(
    mixture.sugarMass,
    82,
    'sugar mass',
  );
});
