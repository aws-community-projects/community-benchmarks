import { DynamoDB, S3 } from 'aws-sdk';
import csv from 'csvtojson';

const bucketName = process.env.BUCKET_NAME;
const bucketKey = process.env.BUCKET_KEY;
const tableName = process.env.TABLE_NAME;

const docClient = new DynamoDB.DocumentClient();
const s3 = new S3();

export const handler = async () => {
  if (!bucketName || !bucketKey || !tableName) {
    throw new Error('Missing required env var!');
  }
  const s3Stream = s3
    .getObject({ Bucket: bucketName, Key: bucketKey })
    .createReadStream();

  await csv()
    .fromStream(s3Stream)
    .subscribe(async (item) => {
      await docClient
        .put({
          Item: { ...item, pk: item['Order ID'], sk: item['Order Date'] },
          TableName: tableName,
        })
        .promise();
    });

  return {
    statusCode: 200,
  };
};
