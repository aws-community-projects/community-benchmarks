import { createReadStream } from 'fs';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { batchWriteFn } from '../../__mocks__/aws-sdk/clients/dynamodb';
import { getObjectFn } from '../../__mocks__/aws-sdk/clients/s3';
import { awsSdkV2PromiseResponse } from '../../__mocks__/awsSdkV2PromiseResponse';
import { handler } from './csv2ddb-sdk2-clients';

vi.mock('aws-sdk/clients/dynamodb');
vi.mock('aws-sdk/clients/s3');

describe('csv 2 dynamodb clients', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  test('parse the file and write 100 items', async () => {
    awsSdkV2PromiseResponse.mockReturnValueOnce(
      createReadStream('./assets/100 Sales Records.csv')
    );

    const result = await handler();
    expect(result).toEqual({ statusCode: 200 });
    expect(batchWriteFn.mock.calls).toMatchSnapshot();
    expect(batchWriteFn).toHaveBeenCalledTimes(4);
    expect(getObjectFn.mock.calls).toMatchSnapshot();
    expect(getObjectFn).toHaveBeenCalledTimes(1);
  });

  test('ensure env vars are set', async () => {
    process.env.TABLE_NAME = '';
    vi.resetModules();
    await expect(async () =>
      (await import('./csv2ddb-sdk2-clients')).handler()
    ).rejects.toThrowError('Missing required env var!');
  });
});
