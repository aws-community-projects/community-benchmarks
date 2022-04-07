// Stolen from SO https://stackoverflow.com/a/55297611/1487358

// Useful for determining average (p50) and p90.
export const quantile = (arr: number[], q: number): number => {
  const sorted = asc(arr);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return twoDecimals(sorted[base] + rest * (sorted[base + 1] - sorted[base]));
  } else {
    return twoDecimals(sorted[base]);
  }
};

// Sort number array in ascending order.
const asc = (arr: number[]): number[] => arr.sort((a, b) => a - b);

// Round number to two decimals.
const twoDecimals = (num: number): number =>
  Math.round((num + Number.EPSILON) * 100) / 100;
