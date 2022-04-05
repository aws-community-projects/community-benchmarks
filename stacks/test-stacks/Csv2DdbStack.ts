import {
  Bucket,
  Function,
  Stack,
  StackProps,
  Table,
  TableFieldType,
} from '@serverless-stack/resources';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  Architecture,
  Code,
  LayerVersion,
  Tracing,
} from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

import { LambdaTest } from '../benchmark/BenchmarkMachineStack';

const fileSize = 100;

export class Csv2DdbStack extends Stack {
  public lambdaTests: LambdaTest[] = [];
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Table to store sales figures.
    const table = new Table(this, 'SalesTable', {
      dynamodbTable: {
        removalPolicy: RemovalPolicy.DESTROY,
        tableName: 'Sales',
      },
      fields: { pk: TableFieldType.STRING, sk: TableFieldType.STRING },
      primaryIndex: { partitionKey: 'pk', sortKey: 'sk' },
    });

    // S3 bucket with csv.
    const bucket = new Bucket(this, 'SalesCsvBucket', {
      s3Bucket: {
        autoDeleteObjects: true,
        removalPolicy: RemovalPolicy.DESTROY,
      },
    });

    new BucketDeployment(this, 'SalesCsvDeployment', {
      destinationBucket: bucket.s3Bucket,
      sources: [Source.asset('assets/')],
    });

    const sdkLayer = new LayerVersion(this, 'SdkLayer', {
      code: Code.fromAsset(`node_modules/aws-sdk`),
    });

    // Default Lambda props that can be overridden in function declarations.
    const lambdaProps = {
      architecture: Architecture.ARM_64,
      bundling: { minify: true, sourceMap: true, externalModules: [] },
      environment: {
        BUCKET_NAME: bucket.bucketName,
        BUCKET_KEY: `${fileSize} Sales Records.csv`,
        NODE_OPTIONS: '--enable-source-maps',
        TABLE_NAME: table.tableName,
      },
      logRetention: RetentionDays.ONE_DAY,
      memorySize: 512,
      timeout: Duration.minutes(1),
      tracing: Tracing.ACTIVE,
    };

    const csv2ddbSdk2Clients = new Function(this, 'csv2ddb-sdk2-clients', {
      ...lambdaProps,
      bundle: { ...lambdaProps.bundling },
      description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Installs only clients from aws-sdk v2.`,
      handler: 'csv2ddb-sdk2-clients.handler',
      functionName: 'csv2ddb-sdk2-clients',
      srcPath: 'src/csv2ddb',
    });

    const csv2ddbSdk2 = new Function(this, 'csv2ddb-sdk2', {
      ...lambdaProps,
      bundle: { ...lambdaProps.bundling },
      description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Installs full aws-sdk v2.`,
      handler: 'csv2ddb-sdk2.handler',
      functionName: 'csv2ddb-sdk2',
      srcPath: 'src/csv2ddb',
    });

    const csv2ddbSdk2Native = new Function(this, 'csv2ddb-sdk2-native', {
      ...lambdaProps,
      bundle: { ...lambdaProps.bundling, externalModules: ['aws-sdk'] },
      description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Uses native aws-sdk v2.`,
      handler: 'csv2ddb-sdk2.handler',
      functionName: 'csv2ddb-sdk2-native',
      srcPath: 'src/csv2ddb',
    });

    const csv2ddbSdk2Layer = new Function(this, 'csv2ddb-sdk2-layer', {
      ...lambdaProps,
      bundle: { ...lambdaProps.bundling },
      description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Uses layer aws-sdk v2.`,
      handler: 'csv2ddb-sdk2.handler',
      functionName: 'csv2ddb-sdk2-layer',
      layers: [sdkLayer],
      srcPath: 'src/csv2ddb',
    });

    const csv2ddbSdk3 = new Function(this, 'csv2ddb-sdk3', {
      ...lambdaProps,
      bundle: { ...lambdaProps.bundling },
      description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Uses modular aws sdk v3.`,
      handler: 'csv2ddb-sdk3.handler',
      functionName: 'csv2ddb-sdk3',
      srcPath: 'src/csv2ddb',
    });

    const fns = [
      csv2ddbSdk2,
      csv2ddbSdk2Clients,
      csv2ddbSdk2Native,
      csv2ddbSdk2Layer,
      csv2ddbSdk3,
    ];

    fns.forEach((fn) => {
      bucket.s3Bucket.grantRead(fn);
      table.dynamodbTable.grantWriteData(fn);

      // Test props.
      this.lambdaTests.push({
        arn: fn.functionArn,
        concurrency: 50,
        passes: 100,
        payload: {},
      });
    });
  }
}
