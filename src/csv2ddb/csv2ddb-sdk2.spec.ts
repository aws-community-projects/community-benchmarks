import { createReadStream } from 'fs';

import { putFn } from '../../__mocks__/aws-sdk/clients/dynamodb';
import { awsSdkV2PromiseResponse } from '../../__mocks__/awsSdkV2PromiseResponse';
import { handler } from './csv2ddb-sdk2';

describe('csv 2 dynamodb full sdk', () => {
  beforeEach(() => jest.resetModules());
  test('parse the file and write 100 items', async () => {
    awsSdkV2PromiseResponse.mockReturnValueOnce(
      createReadStream('./assets/100 Sales Records.csv')
    );

    const result = await handler();
    expect(result).toEqual({ statusCode: 200 });
    expect(putFn).toHaveBeenCalledWith({
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
    expect(putFn).toHaveBeenCalledTimes(100);
  });

  test('ensure env vars are set', async () => {
    process.env.TABLE_NAME = '';
    jest.resetModules();
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      await require('./csv2ddb-sdk2').handler();
    } catch (e) {
      expect((e as Error).message).toBe('Missing required env var!');
    }
  });
});
