import imports from './imports.cjs';

const bucketName = process.env.BUCKET_NAME;
const bucketKey = process.env.BUCKET_KEY;
const tableName = process.env.TABLE_NAME;

const docClient = new imports.DynamoDB.DocumentClient();
const s3 = new imports.S3();

const writeBatch = async (items) => {
  if (!tableName) {
    throw new Error('Missing required env var!');
  }
  return docClient
    .batchWrite({
      RequestItems: {
        [tableName]: items.map((i) => ({
          PutRequest: {
            Item: {
              ...i,
              pk: i['Order ID'],
              sk: i['Order Date'],
            },
          },
        })),
      },
    })
    .promise();
};

export const handler = async () => {
  if (!bucketName || !bucketKey || !tableName) {
    throw new Error('Missing required env var!');
  }
  const s3Stream = s3
    .getObject({ Bucket: bucketName, Key: bucketKey })
    .createReadStream();

  let items = [];

  await imports
    .csv()
    .fromStream(s3Stream)
    .subscribe(async (item) => {
      items.push(item);
      if (items.length > 24) {
        await writeBatch(items);
        items = [];
      }
    });

  if (items.length) {
    await writeBatch(items);
  }

  return {
    statusCode: 200,
  };
};
