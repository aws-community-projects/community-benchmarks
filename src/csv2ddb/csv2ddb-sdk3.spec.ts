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
    expect(docClientMock.call(0).args[0].input).toEqual({
      Item: {
        Country: 'Tuvalu',
        'Item Type': 'Baby Food',
        'Order Date': '5/28/2010',
        'Order ID': '669165933',
        'Order Priority': 'H',
        Region: 'Australia and Oceania',
        'Sales Channel': 'Offline',
        'Ship Date': '6/27/2010',
        'Total Cost': '1582243.50',
        'Total Profit': '951410.50',
        'Total Revenue': '2533654.00',
        'Unit Cost': '159.42',
        'Unit Price': '255.28',
        'Units Sold': '9925',
        pk: '669165933',
        sk: '5/28/2010',
      },
      TableName: 'my-table',
    });
    expect(docClientMock.calls()).toHaveLength(100);
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
