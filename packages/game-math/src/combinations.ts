/**
 * Arbitrary precision Binomial Coefficient C(n, k) using BigInt.
 * Prevents 64-bit float precision loss with large combinations like C(80, 20).
 */
export function combinations(n: number, k: number): bigint {
  if (k < 0 || k > n) {
    return 0n;
  }
  if (k === 0 || k === n) {
    return 1n;
  }
  if (k > n / 2) {
    k = n - k;
  }

  let result = 1n;
  for (let i = 1; i <= k; i++) {
    result = (result * BigInt(n - i + 1)) / BigInt(i);
  }
  return result;
}
