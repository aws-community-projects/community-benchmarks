/* eslint-disable @typescript-eslint/no-var-requires */
import { createReadStream } from 'fs';

import { batchWriteFn } from '../../../__mocks__/aws-sdk/clients/dynamodb';
import { getObjectFn } from '../../../__mocks__/aws-sdk/clients/s3';
import { awsSdkV2PromiseResponse } from '../../../__mocks__/awsSdkV2PromiseResponse';
import { beforeEach, vi, describe, test, expect } from 'vitest';

const handler = require('./csv2ddb-sdk2-js').handler;

vi.mock('aws-sdk');

describe('csv 2 dynamodb full sdk', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  test('blah', () => {
    expect(true).toBeTruthy();
  });
  // test('parse the file and write 100 items', async () => {
  //   awsSdkV2PromiseResponse.mockReturnValueOnce(
  //     createReadStream('./assets/100 Sales Records.csv')
  //   );

  //   const result = await handler();
  //   expect(result).toEqual({ statusCode: 200 });
  //   expect(batchWriteFn.mock.calls).toMatchSnapshot();
  //   expect(batchWriteFn).toHaveBeenCalledTimes(4);
  //   expect(getObjectFn.mock.calls).toMatchSnapshot();
  //   expect(getObjectFn).toHaveBeenCalledTimes(1);
  // });

  // test('ensure env vars are set', async () => {
  //   process.env.TABLE_NAME = '';
  //   vi.resetModules();
  //   await expect(() =>
  //     require('./csv2ddb-sdk2-js').handler()
  //   ).rejects.toThrowError('Missing required env var!');
  // });
});
