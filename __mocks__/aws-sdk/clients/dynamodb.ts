/**
 * Lightweight mock of DynamoDB DocumentClient from aws-sdk v2.
 * Only used methods are mocked.
 * @see https://dev.to/elthrasher/mocking-aws-with-jest-and-typescript-199i
 */

import { awsSdkV2PromiseResponse } from '../../awsSdkV2PromiseResponse';

export const putFn = jest
  .fn()
  .mockImplementation(() => ({ promise: awsSdkV2PromiseResponse }));

class DocumentClient {
  put = putFn;
}

const DynamoDB = {
  DocumentClient,
};

export default DynamoDB;
