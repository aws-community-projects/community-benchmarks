/* eslint-disable @typescript-eslint/no-var-requires */
const AWS = require('aws-sdk');
const csv = require('csvtojson');
const xray = require('aws-xray-sdk-core');

const bucketName = process.env.BUCKET_NAME;
const bucketKey = process.env.BUCKET_KEY;
const tableName = process.env.TABLE_NAME;

const docClient = new AWS.DynamoDB.DocumentClient();
xray.captureAWSClient(docClient.service);
const s3 = new AWS.S3();
xray.captureAWSClient(s3);

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

exports.handler = async () => {
  if (!bucketName || !bucketKey || !tableName) {
    throw new Error('Missing required env var!');
  }
  const s3Stream = s3
    .getObject({ Bucket: bucketName, Key: bucketKey })
    .createReadStream();

  let items = [];

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
