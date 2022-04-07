import { quantile } from './utils';

describe('utility functions', () => {
  test('quantile', () => {
    expect(quantile([1, 2, 3, 4, 5, 1, 5], 0.5)).toBe(3);
    expect(
      quantile([9.3, 4.3, 99.2, 4.4, 3, 22.11, 1, 0.2, 4, 16.234], 0.9)
    ).toBe(29.82);
  });
});
