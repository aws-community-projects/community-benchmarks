import {
  Bucket,
  Function,
  FunctionProps,
  Stack,
  StackProps,
  Table,
  TableFieldType,
} from '@serverless-stack/resources';
import {
  AssetHashType,
  DockerImage,
  Duration,
  RemovalPolicy,
} from 'aws-cdk-lib';
import {
  Architecture,
  Code,
  Function as LambdaFunction,
  LayerVersion,
  Runtime,
  Tracing,
} from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { execSync, ExecSyncOptions } from 'child_process';
import { Construct } from 'constructs';
import { copyFileSync } from 'fs';

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

    const execOptions: ExecSyncOptions = {
      stdio: ['ignore', process.stderr, 'inherit'],
    };

    const sdkLayer = new LayerVersion(this, 'SdkLayer', {
      code: Code.fromAsset(`node_modules/aws-sdk`, {
        assetHashType: AssetHashType.OUTPUT,
        bundling: {
          command: ['sh', '-c', 'echo "Docker build not supported."'],
          image: DockerImage.fromRegistry('alpine'),
          local: {
            tryBundle(outputDir: string) {
              try {
                execSync('touch blank.txt && mkdir nodejs', {
                  ...execOptions,
                  cwd: outputDir,
                });
              } catch {
                return false;
              }
              execSync(`npm init -y && npm i aws-sdk`, {
                ...execOptions,
                cwd: `${outputDir}/nodejs`,
              });
              return true;
            },
          },
        },
      }),
    });

    const environment = {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      BUCKET_NAME: bucket.bucketName,
      BUCKET_KEY: `${fileSize} Sales Records.csv`,
      COLD_STARTER: new Date().toISOString(),
      NODE_OPTIONS: '--enable-source-maps',
      TABLE_NAME: table.tableName,
    };

    // Default Lambda props that can be overridden in function declarations.
    const lambdaProps: FunctionProps = {
      architecture: Architecture.ARM_64,
      bundle: { format: 'esm', minify: true },
      environment,
      logRetention: RetentionDays.ONE_DAY,
      memorySize: 512,
      srcPath: 'src/csv2ddb',
      timeout: Duration.minutes(1),
      tracing: Tracing.ACTIVE,
    };

    const csv2ddbSdk2ClientsEsm = new Function(
      this,
      'csv2ddb-sdk2-clients-esm',
      {
        ...lambdaProps,
        description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Installs only clients from aws-sdk v2 bundled with esm.`,
        handler: 'csv2ddb-sdk2-clients.handler',
        functionName: 'csv2ddb-sdk2-clients-esm',
      }
    );

    const csv2ddbSdk2ClientsEsmXRay = new Function(
      this,
      'csv2ddb-sdk2-clients-esm-xray',
      {
        ...lambdaProps,
        description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Installs only clients from aws-sdk v2 bundled with esm.`,
        handler: 'csv2ddb-sdk2-clients-xray.handler',
        functionName: 'csv2ddb-sdk2-clients-esm-xray',
      }
    );

    const csv2ddbSdk2ClientsNative = new Function(
      this,
      'csv2ddb-sdk2-clients-native',
      {
        ...lambdaProps,
        description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Installs only clients using native aws-sdk v2.`,
        handler: 'csv2ddb-sdk2-clients.handler',
        functionName: 'csv2ddb-sdk2-clients-native',
      }
    );

    const csv2ddbSdk2ClientsNativeXRay = new Function(
      this,
      'csv2ddb-sdk2-clients-native-xray',
      {
        ...lambdaProps,
        description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Installs only clients using native aws-sdk v2.`,
        handler: 'csv2ddb-sdk2-clients-xray.handler',
        functionName: 'csv2ddb-sdk2-clients-native-xray',
      }
    );

    const csv2ddbSdk2Esm = new Function(this, 'csv2ddb-sdk2-esm', {
      ...lambdaProps,
      description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Installs full aws-sdk v2 bundled with esm.`,
      handler: 'csv2ddb-sdk2.handler',
      functionName: 'csv2ddb-sdk2-esm',
    });

    const csv2ddbSdk2Native = new Function(this, 'csv2ddb-sdk2-native', {
      ...lambdaProps,
      description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Uses native aws-sdk v2.`,
      handler: 'csv2ddb-sdk2.handler',
      functionName: 'csv2ddb-sdk2-native',
    });

    const csv2ddbSdk2Layer = new Function(this, 'csv2ddb-sdk2-layer', {
      ...lambdaProps,
      description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Uses aws-sdk v2 from a Lambda Layer.`,
      handler: 'csv2ddb-sdk2.handler',
      functionName: 'csv2ddb-sdk2-layer',
      layers: [sdkLayer],
    });

    const csv2ddbSdk3 = new Function(this, 'csv2ddb-sdk3', {
      ...lambdaProps,
      description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Uses modular aws sdk v3 bundled with esm.`,
      handler: 'csv2ddb-sdk3.handler',
      functionName: 'csv2ddb-sdk3',
    });

    const csv2ddbSdk3XRay = new Function(this, 'csv2ddb-sdk3-xray', {
      ...lambdaProps,
      description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Uses modular aws sdk v3 bundled with esm.`,
      handler: 'csv2ddb-sdk3-xray.handler',
      functionName: 'csv2ddb-sdk3-xray',
    });

    const csv2ddbSdk2Js = new LambdaFunction(this, 'csv2ddb-sdk2-js', {
      architecture: Architecture.ARM_64,
      code: Code.fromAsset(`src/csv2ddb/js`, {
        assetHashType: AssetHashType.OUTPUT,
        bundling: {
          command: ['sh', '-c', 'echo "Docker build not supported."'],
          image: DockerImage.fromRegistry('alpine'),
          local: {
            tryBundle(outputDir: string) {
              try {
                copyFileSync(
                  'src/csv2ddb/js/csv2ddb-sdk2-js.js',
                  `${outputDir}/csv2ddb-sdk2-js.js`
                );
              } catch {
                return false;
              }
              execSync(`npm init -y && npm i csvtojson`, {
                ...execOptions,
                cwd: outputDir,
              });
              return true;
            },
          },
        },
      }),
      description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Uses native aws-sdk v2 and is CommonJS JavaScript-only with no transpiling.`,
      environment,
      handler: 'csv2ddb-sdk2-js.handler',
      functionName: 'csv2ddb-sdk2-js',
      logRetention: RetentionDays.ONE_DAY,
      memorySize: 512,
      runtime: Runtime.NODEJS_14_X,
      timeout: Duration.minutes(1),
      tracing: Tracing.ACTIVE,
    });

    const csv2ddbSdk2JsXRay = new LambdaFunction(this, 'csv2ddb-sdk2-js-xray', {
      architecture: Architecture.ARM_64,
      code: Code.fromAsset(`src/csv2ddb/js-xray`, {
        assetHashType: AssetHashType.OUTPUT,
        bundling: {
          command: ['sh', '-c', 'echo "Docker build not supported."'],
          image: DockerImage.fromRegistry('alpine'),
          local: {
            tryBundle(outputDir: string) {
              try {
                copyFileSync(
                  'src/csv2ddb/js-xray/csv2ddb-sdk2-js-xray.js',
                  `${outputDir}/csv2ddb-sdk2-js-xray.js`
                );
              } catch {
                return false;
              }
              execSync(`npm init -y && npm i aws-xray-sdk-core csvtojson`, {
                ...execOptions,
                cwd: outputDir,
              });
              return true;
            },
          },
        },
      }),
      description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Uses native aws-sdk v2 and is CommonJS JavaScript-only with no transpiling.`,
      environment,
      handler: 'csv2ddb-sdk2-js-xray.handler',
      functionName: 'csv2ddb-sdk2-js-xray',
      logRetention: RetentionDays.ONE_DAY,
      memorySize: 512,
      runtime: Runtime.NODEJS_14_X,
      timeout: Duration.minutes(1),
      tracing: Tracing.ACTIVE,
    });

    const csv2ddbSdk2Mjs = new LambdaFunction(this, 'csv2ddb-sdk2-mjs', {
      architecture: Architecture.ARM_64,
      code: Code.fromAsset(`src/csv2ddb/sdk2-mjs`, {
        assetHashType: AssetHashType.OUTPUT,
        bundling: {
          command: ['sh', '-c', 'echo "Docker build not supported."'],
          image: DockerImage.fromRegistry('alpine'),
          local: {
            tryBundle(outputDir: string) {
              try {
                copyFileSync(
                  'src/csv2ddb/sdk2-mjs/csv2ddb-sdk2-mjs.mjs',
                  `${outputDir}/csv2ddb-sdk2-mjs.mjs`
                );
                copyFileSync(
                  'src/csv2ddb/sdk2-mjs/imports.cjs',
                  `${outputDir}/imports.cjs`
                );
              } catch {
                /* istanbul ignore next */
                return false;
              }
              execSync(`npm init -y && npm i csvtojson`, {
                ...execOptions,
                cwd: outputDir,
              });
              return true;
            },
          },
        },
      }),
      description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Uses native aws-sdk v2 and is ESModule JavaScript-only with no transpiling.`,
      environment,
      handler: 'csv2ddb-sdk2-mjs.handler',
      functionName: 'csv2ddb-sdk2-mjs',
      logRetention: RetentionDays.ONE_DAY,
      memorySize: 512,
      runtime: Runtime.NODEJS_14_X,
      timeout: Duration.minutes(1),
      tracing: Tracing.ACTIVE,
    });

    const csv2ddbSdk2MjsXRay = new LambdaFunction(
      this,
      'csv2ddb-sdk2-mjs-xray',
      {
        architecture: Architecture.ARM_64,
        code: Code.fromAsset(`src/csv2ddb/sdk2-mjs-xray`, {
          assetHashType: AssetHashType.OUTPUT,
          bundling: {
            command: ['sh', '-c', 'echo "Docker build not supported."'],
            image: DockerImage.fromRegistry('alpine'),
            local: {
              tryBundle(outputDir: string) {
                try {
                  copyFileSync(
                    'src/csv2ddb/sdk2-mjs-xray/csv2ddb-sdk2-mjs-xray.mjs',
                    `${outputDir}/csv2ddb-sdk2-mjs-xray.mjs`
                  );
                  copyFileSync(
                    'src/csv2ddb/sdk2-mjs-xray/imports.cjs',
                    `${outputDir}/imports.cjs`
                  );
                } catch {
                  /* istanbul ignore next */
                  return false;
                }
                execSync(`npm init -y && npm i aws-xray-sdk-core csvtojson`, {
                  ...execOptions,
                  cwd: outputDir,
                });
                return true;
              },
            },
          },
        }),
        description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Uses native aws-sdk v2 and is ESModule JavaScript-only with no transpiling.`,
        environment,
        handler: 'csv2ddb-sdk2-mjs-xray.handler',
        functionName: 'csv2ddb-sdk2-mjs-xray',
        logRetention: RetentionDays.ONE_DAY,
        memorySize: 512,
        runtime: Runtime.NODEJS_14_X,
        timeout: Duration.minutes(1),
        tracing: Tracing.ACTIVE,
      }
    );

    const csv2ddbSdk3Mjs = new LambdaFunction(this, 'csv2ddb-sdk3-mjs', {
      architecture: Architecture.ARM_64,
      code: Code.fromAsset(`src/csv2ddb/sdk3-mjs`, {
        assetHashType: AssetHashType.OUTPUT,
        bundling: {
          command: ['sh', '-c', 'echo "Docker build not supported."'],
          image: DockerImage.fromRegistry('alpine'),
          local: {
            tryBundle(outputDir: string) {
              try {
                copyFileSync(
                  'src/csv2ddb/sdk3-mjs/csv2ddb-sdk3-mjs.mjs',
                  `${outputDir}/csv2ddb-sdk3-mjs.mjs`
                );
              } catch {
                /* istanbul ignore next */
                return false;
              }
              execSync(
                `npm init -y && npm i @aws-sdk/client-dynamodb @aws-sdk/client-s3 @aws-sdk/lib-dynamodb csvtojson`,
                {
                  ...execOptions,
                  cwd: outputDir,
                }
              );
              return true;
            },
          },
        },
      }),
      description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Uses native aws-sdk v2 and is ESModule JavaScript-only with no transpiling.`,
      environment,
      handler: 'csv2ddb-sdk3-mjs.handler',
      functionName: 'csv2ddb-sdk3-mjs',
      logRetention: RetentionDays.ONE_DAY,
      memorySize: 512,
      runtime: Runtime.NODEJS_14_X,
      timeout: Duration.minutes(1),
      tracing: Tracing.ACTIVE,
    });

    const csv2ddbSdk3MjsXRay = new LambdaFunction(
      this,
      'csv2ddb-sdk3-mjs-xray',
      {
        architecture: Architecture.ARM_64,
        code: Code.fromAsset(`src/csv2ddb/sdk3-mjs-xray`, {
          assetHashType: AssetHashType.OUTPUT,
          bundling: {
            command: ['sh', '-c', 'echo "Docker build not supported."'],
            image: DockerImage.fromRegistry('alpine'),
            local: {
              tryBundle(outputDir: string) {
                try {
                  copyFileSync(
                    'src/csv2ddb/sdk3-mjs-xray/csv2ddb-sdk3-mjs-xray.mjs',
                    `${outputDir}/csv2ddb-sdk3-mjs-xray.mjs`
                  );
                  copyFileSync(
                    'src/csv2ddb/sdk3-mjs-xray/imports.cjs',
                    `${outputDir}/imports.cjs`
                  );
                } catch {
                  /* istanbul ignore next */
                  return false;
                }
                execSync(
                  `npm init -y && npm i @aws-sdk/client-dynamodb @aws-sdk/client-s3 @aws-sdk/lib-dynamodb aws-xray-sdk-core csvtojson`,
                  {
                    ...execOptions,
                    cwd: outputDir,
                  }
                );
                return true;
              },
            },
          },
        }),
        description: `Reads ${fileSize} rows of CSV and writes to DynamoDB. Uses native aws-sdk v2 and is ESModule JavaScript-only with no transpiling.`,
        environment,
        handler: 'csv2ddb-sdk3-mjs-xray.handler',
        functionName: 'csv2ddb-sdk3-mjs-xray',
        logRetention: RetentionDays.ONE_DAY,
        memorySize: 512,
        runtime: Runtime.NODEJS_14_X,
        timeout: Duration.minutes(1),
        tracing: Tracing.ACTIVE,
      }
    );

    const fns = [
      csv2ddbSdk2Esm,
      csv2ddbSdk2ClientsNative,
      csv2ddbSdk2ClientsNativeXRay,
      csv2ddbSdk2ClientsEsm,
      csv2ddbSdk2ClientsEsmXRay,
      csv2ddbSdk2Native,
      csv2ddbSdk2Layer,
      csv2ddbSdk3,
      csv2ddbSdk3XRay,
      csv2ddbSdk2Js,
      csv2ddbSdk2JsXRay,
      csv2ddbSdk2Mjs,
      csv2ddbSdk2MjsXRay,
      csv2ddbSdk3Mjs,
      csv2ddbSdk3MjsXRay,
    ];

    fns.forEach((fn) => {
      bucket.s3Bucket.grantRead(fn);
      table.dynamodbTable.grantWriteData(fn);

      // Test props.
      this.lambdaTests.push({
        arn: fn.functionArn,
        concurrency: 10,
        passes: 20,
        payload: {},
      });
    });
  }
}
