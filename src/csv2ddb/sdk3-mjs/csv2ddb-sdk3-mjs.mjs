import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetObjectCommand, S3 } from '@aws-sdk/client-s3';
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import csv from 'csvtojson';

const bucketName = process.env.BUCKET_NAME;
const bucketKey = process.env.BUCKET_KEY;
const tableName = process.env.TABLE_NAME;

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3({});

const writeBatch = async (items) => {
  if (!tableName) {
    throw new Error('Missing required env var!');
  }
  const command = new BatchWriteCommand({
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
  });
  return docClient.send(command);
};

export const handler = async () => {
  if (!bucketName || !bucketKey || !tableName) {
    throw new Error('Missing required env var!');
  }
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: bucketKey,
  });
  const response = await s3.send(getCommand);

  let items = [];

  await csv()
    .fromStream(response.Body)
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
