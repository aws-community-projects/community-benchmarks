/**
 * Mocking the AWS SDK version 2
 * @see https://dev.to/elthrasher/mocking-aws-with-jest-and-typescript-199i
 * Uses `requireActual` because SST uses `SharedIniFileCredentials`
 *
 * For mocking AWS SDK version 3, use https://m-radzikowski.github.io/aws-sdk-client-mock/
 */

import DynamoDB from './aws-sdk/clients/dynamodb';
import S3 from './aws-sdk/clients/s3';

const SharedIniFileCredentials =
  jest.requireActual('aws-sdk').SharedIniFileCredentials;

export { DynamoDB, S3, SharedIniFileCredentials };
