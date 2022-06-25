import { GetObjectCommand, S3 } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { createReadStream } from 'fs';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { handler } from './csv2ddb-sdk3';

const docClientMock = mockClient(DynamoDBDocumentClient);
const s3Mock = mockClient(S3);

describe('csv 3 dynamodb full sdk', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  test('parse the file and write 100 items', async () => {
    s3Mock
      .on(GetObjectCommand)
      .resolves({ Body: createReadStream('./assets/100 Sales Records.csv') });
    docClientMock.on(PutCommand).resolves({});

    const result = await handler();
    expect(result).toEqual({ statusCode: 200 });
    expect(docClientMock.calls().map((c) => c.args[0].input)).toMatchSnapshot();
    expect(docClientMock.calls()).toHaveLength(4);
  });

  test('ensure env vars are set', async () => {
    process.env.TABLE_NAME = '';
    vi.resetModules();
    await expect(async () =>
      (await import('./csv2ddb-sdk2-clients')).handler()
    ).rejects.toThrowError('Missing required env var!');
  });
});
