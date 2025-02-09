/**
 * return the boiling temperature of a solution at a given ABV
 *
 * @param liquidAbv - The ABV of the solution
 *
 * @returns The boiling temperature of the solution in Celsius
 */
export function abvToBoilTemp(liquidAbv: number): number {
	let abvPercent = liquidAbv / 100;
	return Number(
		// return the ºC temperature at which a solution at ABV will boil
		60.526 * abvPercent ** 4 -
			163.16 * abvPercent ** 3 +
			163.96 * abvPercent ** 2 -
			83.438 * abvPercent +
			100,
	);
}

/**
 * return the ABV of a solution at a given boiling temperature
 *
 * @param boilTemp - The boiling temperature of the solution in Celsius
 *
 * @returns The ABV of the solution
 */
function liquidAbvToVaporABV(liquidAbv: number): number {
	let abvPercent = liquidAbv / 100;
	return Number(
		100 *
			(-94.7613 * abvPercent ** 8 +
				450.932 * abvPercent ** 7 -
				901.175 * abvPercent ** 6 +
				985.803 * abvPercent ** 5 -
				644.997 * abvPercent ** 4 +
				259.985 * abvPercent ** 3 -
				64.505 * abvPercent ** 2 +
				9.71706 * abvPercent +
				1.2824424781005507e-4),
	);
}

/**
 * use the Newton-Raphson method to find the root of a function
 *
 * @param y - The target value of the function
 * @param fn - The function to find the root of
 */
function reverse(y: number, fn: (x: number) => number): number {
	// Define the convergence tolerance and the maximum number of
	// iterations to perform
	const tol = 1e-3;
	const maxIter = 100;

	// Initialize the guess for x
	let x = 0;

	// Perform the Newton-Raphson iteration
	for (let i = 0; i < maxIter; i++) {
		// Calculate the difference between the function value and the
		// target value
		const diff = fn(x) - y;

		// If the difference is within the tolerance, return the current
		// value of x
		if (Math.abs(diff) < tol) {
			return x;
		}

		// Calculate the derivative of the function using a finite
		// difference approximation
		const dx = 1e-3;
		const dydx = (fn(x + dx) - fn(x)) / dx;

		// Update the guess for x using the Newton-Raphson formula
		x -= diff / dydx;
	}

	// If the iteration fails to converge within the maximum number of iterations, return NaN
	return NaN;
}
