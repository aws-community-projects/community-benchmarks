import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const tableName = process.env.TABLE_NAME;

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async () => {
  const command = new ScanCommand({
    TableName: tableName,
  });
  return docClient.send(command);
};
