import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetObjectCommand, S3 } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import csv from 'csvtojson';

const bucketName = process.env.BUCKET_NAME;
const bucketKey = process.env.BUCKET_KEY;
const tableName = process.env.TABLE_NAME;

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3({});

export const handler = async () => {
  if (!bucketName || !bucketKey || !tableName) {
    throw new Error('Missing required env var!');
  }
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: bucketKey,
  });
  const response = await s3.send(getCommand);

  await csv()
    .fromStream(response.Body)
    .subscribe(async (item) => {
      const command = new PutCommand({
        Item: { ...item, pk: item['Order ID'], sk: item['Order Date'] },
        TableName: tableName,
      });
      await docClient.send(command);
    });

  return {
    statusCode: 200,
  };
};
