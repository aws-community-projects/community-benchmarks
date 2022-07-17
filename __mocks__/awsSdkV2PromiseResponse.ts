/**
 * For use in mocking AWS SDK v2.
 * @see https://dev.to/elthrasher/mocking-aws-with-jest-and-typescript-199i
 */
import { vi } from 'vitest';

export const awsSdkV2PromiseResponse = vi
  .fn()
  .mockReturnValue(Promise.resolve(true));
