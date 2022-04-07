/**
 * For use in mocking AWS SDK v2.
 * @see https://dev.to/elthrasher/mocking-aws-with-jest-and-typescript-199i
 */

export const awsSdkV2PromiseResponse = jest
  .fn()
  .mockReturnValue(Promise.resolve(true));
