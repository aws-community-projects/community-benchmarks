import DynamoDB, { DocumentClient } from 'aws-sdk/clients/dynamodb';
import S3 from 'aws-sdk/clients/s3';
import { captureAWSClient } from 'aws-xray-sdk-core';
import csv from 'csvtojson';

const bucketName = process.env.BUCKET_NAME;
const bucketKey = process.env.BUCKET_KEY;
const tableName = process.env.TABLE_NAME;

const docClient = new DynamoDB.DocumentClient();
captureAWSClient((docClient as DocumentClient & { service: DynamoDB }).service);
const s3 = new S3();
captureAWSClient(s3);

type item = { [key: string]: string };

const writeBatch = async (items: item[]) => {
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

  let items = [] as item[];

  await csv()
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
