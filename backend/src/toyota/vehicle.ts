// A simple, openly synthetic model of what a car is worth. It is NOT real market data, and every screen
// that shows a value also shows this assumption.
//
//  - year 1: loses 20% of the sticker price, straight line
//  - after that: keeps 88% of its value each year
//  - mileage: every mile above 12,000 a year costs $0.08 (every mile below adds $0.08, up to $1,500)
export const VALUE_ASSUMPTION =
  'Estimated value uses a simple model (20% lost in year one, then 12% a year, $0.08 a mile above 12,000 a year). It is not a market quote.';

export interface ValueInput { msrp: number; ageMonths: number; miles: number }

export function carValue({ msrp, ageMonths, miles }: ValueInput): number {
  const age = Math.max(0, ageMonths);
  const retained = age <= 12 ? 1 - 0.2 * (age / 12) : 0.8 * 0.88 ** ((age - 12) / 12);
  const expected = (12000 * age) / 12;
  const mileAdj = Math.min(1500, Math.max(-Infinity, (expected - miles) * 0.08));
  return Math.max(1500, msrp * retained + mileAdj);
}

// Rough fuel cost for a month of driving.
export function fuelPerMonth(milesPerMonth: number, mpg: number, gasPrice = 3.5): number {
  return (milesPerMonth / mpg) * gasPrice;
}
