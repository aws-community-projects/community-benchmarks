/**
 * Lightweight mock of S3 client from aws-sdk v2.
 * Only used methods are mocked.
 * @see https://dev.to/elthrasher/mocking-aws-with-jest-and-typescript-199i
 */

import { awsSdkV2PromiseResponse } from '../../awsSdkV2PromiseResponse';

export const getObjectFn = jest.fn().mockImplementation(() => ({
  createReadStream: awsSdkV2PromiseResponse,
}));

export default class S3 {
  customizeRequests = () => true;
  getObject = getObjectFn;
}
