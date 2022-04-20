import { GetObjectCommand, S3 } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { createReadStream } from 'fs';

import { handler } from './csv2ddb-sdk3';

const docClientMock = mockClient(DynamoDBDocumentClient);
const s3Mock = mockClient(S3);

describe('csv 3 dynamodb full sdk', () => {
  beforeEach(() => jest.resetModules());
  test('parse the file and write 100 items', async () => {
    s3Mock
      .on(GetObjectCommand)
      .resolves({ Body: createReadStream('./assets/100 Sales Records.csv') });
    docClientMock.on(PutCommand).resolves({});

    const result = await handler();
    expect(result).toEqual({ statusCode: 200 });
    expect(docClientMock.calls()).toMatchSnapshot();
    expect(docClientMock.calls()).toHaveLength(4);
  });

  test('ensure env vars are set', async () => {
    process.env.TABLE_NAME = '';
    jest.resetModules();
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      await require('./csv2ddb-sdk3').handler();
    } catch (e) {
      expect((e as Error).message).toBe('Missing required env var!');
    }
  });
});
