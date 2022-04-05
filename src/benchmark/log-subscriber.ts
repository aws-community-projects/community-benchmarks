// Not going to use this handler. I've left it in for the moment so I can copy over some of the DynamoDB stuff.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  Architecture,
  EnvironmentResponse,
  FunctionConfiguration,
  GetFunctionCommand,
  LambdaClient,
  Layer,
  Runtime,
} from '@aws-sdk/client-lambda';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { JsonFormat } from 'typesafe-dynamodb';
import { TypeSafeDocumentClientV3 } from 'typesafe-dynamodb/lib/document-client-v3';
import { TypeSafeGetItemCommand } from 'typesafe-dynamodb/lib/get-item-command';
import { TypeSafePutItemCommand } from 'typesafe-dynamodb/lib/put-item-command';
import { promisify } from 'util';
import { gunzip } from 'zlib';

import type {
  CloudWatchLogsDecodedData,
  CloudWatchLogsEvent,
  CloudWatchLogsLogEvent,
} from 'aws-lambda';

interface Benchmark {
  pk: string;
  sk: string;

  et: string; // Entity Type
  cd: string; // Create Date
  ud: string; // Update Date

  coldStarts: {
    average: number;
    coldStartPercent: number;
    p90: number;
    trend: number;
    total: number;
  };
  durations: { average: number; p90: number; trend: number; total: number };

  arch: (Architecture | string)[];
  codeSize: number;
  description: string;
  environment: EnvironmentResponse;
  functionName: string;
  layers: Layer[];
  memorySize: number;
  runtime: Runtime | string;

  moduleSystem: string;
  sourceMaps: boolean;
}

const tableName = process.env.TABLE_NAME;

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
}) as TypeSafeDocumentClientV3<Benchmark, 'pk', 'sk'>;

const GetItemCommand = TypeSafeGetItemCommand<
  Benchmark,
  'pk',
  'sk',
  JsonFormat.Document
>();
const PutItemCommand = TypeSafePutItemCommand<Benchmark>();

const lambdaClient = new LambdaClient({});
const unzip = promisify(gunzip);

const handleReportEvents = async (
  event: CloudWatchLogsLogEvent,
  config: FunctionConfiguration
) => {
  if (!tableName) {
    throw new Error('Missing required env var!');
  }
  const report = event.message;
  const duration = parseFloat(report.split('\tDuration: ')[1].split(' ms')[0]);
  const init = parseFloat(report.split('Init Duration: ')[1] || '0');
  const {
    Architectures,
    CodeSize,
    Description,
    Environment,
    FunctionName,
    Layers,
    MemorySize,
    Runtime,
  } = config;
  const stats = {
    Architectures,
    CodeSize,
    ColdStart: init,
    Description,
    Duration: duration,
    FunctionName,
    Layers,
    MemorySize,
    Runtime,
    SourceMapsEnabled: !!Environment?.Variables?.NODE_OPTIONS.includes(
      '--enable-source-maps'
    ),
  };

  const now = new Date().toISOString();

  if (FunctionName && Runtime) {
    const benchmark = {
      pk: Runtime,
      sk: FunctionName,

      et: 'BENCHMARK',
      cd: now,
      ud: now,

      coldStarts: {
        average: init,
        coldStartPercent: init ? 100 : 0,
        p90: init,
        // trend: number,
        total: 1,
      },
      durations: {
        average: duration,
        p90: duration,
        // trend: number,
        total: 1,
      },

      arch: [Architecture],
      codeSize: CodeSize,
      description: Description,
      environment: Environment,
      functionName: FunctionName,
      layers: Layers,
      memorySize: MemorySize,
      runtime: Runtime,

      // moduleSystem: string;
      sourceMaps: !!Environment?.Variables?.NODE_OPTIONS.includes(
        '--enable-source-maps'
      ),
    };

    const getCommand = new GetItemCommand({
      Key: {
        pk: Runtime,
        sk: FunctionName,
      },
      TableName: tableName,
    });
    const getResponse = await docClient.send(getCommand);
    console.log(getResponse.Item);
    // if (getResponse.Item) {
    //   const i = getResponse.Item;
    //   benchmark.cd = i.cd;

    //   benchmark.coldStarts: {

    //   }
    // }
  }
};

export const handler = async (input: CloudWatchLogsEvent) => {
  const payload = Buffer.from(input.awslogs.data, 'base64');
  const rawLog = await unzip(payload);
  const log = JSON.parse(rawLog.toString()) as CloudWatchLogsDecodedData;
  console.log('log', log);
  const { logEvents, logGroup, owner } = log;
  const fnArn = `arn:aws:lambda:${
    process.env.AWS_REGION
  }:${owner}:function:${logGroup.replace('/aws/lambda/', '')}`;
  const getCommand = new GetFunctionCommand({ FunctionName: fnArn });
  const fnProps = await lambdaClient.send(getCommand);
  const reportEvents = logEvents.filter((l) =>
    l.message.startsWith('REPORT RequestId: ')
  );

  if (!fnProps.Configuration) {
    throw new Error('Failed to get Function Props!');
  }

  for (const event of reportEvents) {
    await handleReportEvents(event, fnProps.Configuration);
  }
};
