// Default env vars for csv2ddb stack
// Need to re-require to override
process.env.BUCKET_NAME = 'my-bucket';
process.env.BUCKET_KEY = 'my-key';
process.env.TABLE_NAME = 'my-table';

// credit: https://www.irisclasson.com/2020/08/17/jest-snapshot-tests-with-custom-serializer-for-cloudformation-template-tests/
expect.addSnapshotSerializer({
  serialize: (val: string): string =>
    `"${val.replace(/^([A-Fa-f0-9]{64})\.zip$/, '[HASH REMOVED].zip')}"`,
  test: (val: unknown): boolean => typeof val === 'string',
});
