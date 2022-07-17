/**
 * Lightweight mock of DynamoDB DocumentClient from aws-sdk v2.
 * Only used methods are mocked.
 * @see https://dev.to/elthrasher/mocking-aws-with-jest-and-typescript-199i
 */
import { vi } from 'vitest';

import { awsSdkV2PromiseResponse } from '../../awsSdkV2PromiseResponse';

export const batchWriteFn = vi
  .fn()
  .mockImplementation(() => ({ promise: awsSdkV2PromiseResponse }));

class DocumentClient {
  batchWrite = batchWriteFn;
  service = { customizeRequests: () => true };
}

const DynamoDB = {
  DocumentClient,
};

export default DynamoDB;
