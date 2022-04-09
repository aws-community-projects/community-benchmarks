import {
  Function,
  Stack,
  StackProps,
  Table,
  TableFieldType,
} from '@serverless-stack/resources';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Tracing } from 'aws-cdk-lib/aws-lambda';
import {
  IntegrationPattern,
  JsonPath,
  Map,
  Parallel,
  Pass,
  Result,
  StateMachine,
  TaskInput,
} from 'aws-cdk-lib/aws-stepfunctions';
import {
  CallAwsService,
  DynamoAttributeValue,
  DynamoPutItem,
  LambdaInvoke,
  StepFunctionsStartExecution,
} from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';

export interface LambdaTest {
  arn: string;
  concurrency: number;
  passes: number;
  payload: { [key: string]: unknown };
}

interface BenchmarkMachineProps extends StackProps {
  lambdaTests: LambdaTest[];
}

export class BenchmarkMachineStack extends Stack {
  constructor(scope: Construct, id: string, props: BenchmarkMachineProps) {
    super(scope, id, props);
    const { lambdaTests } = props;

    const table = new Table(this, 'BenchmarksTable', {
      dynamodbTable: {
        billingMode: BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.DESTROY,
        tableName: 'Benchmarks',
      },
      fields: { pk: TableFieldType.STRING, sk: TableFieldType.STRING },
      primaryIndex: { partitionKey: 'pk', sortKey: 'sk' },
    });

    // Declare get-traces function with permission to grab xray traces.
    const getTraces = new Function(this, 'GetTraces', {
      functionName: 'get-traces',
      handler: 'get-traces.handler',
      initialPolicy: [
        new PolicyStatement({
          actions: ['xray:BatchGetTraces'],
          resources: ['*'],
        }),
      ],
      srcPath: 'src/benchmark',
      tracing: Tracing.ACTIVE,
    });

    // Step Functions parallel step to fan out to nested Sfn executions.
    const parallel = new Parallel(this, 'Parallel Execution');

    // Loop over functions to test. We will create a new nested state machine for each function.
    lambdaTests.forEach((lambdaTest, index) => {
      // Map state requires an iterable.
      // We take the `passes` property of the test config and turn it into an array of zeros for the map state to iterate.
      const pass = new Pass(this, `Configure ${index}`, {
        result: Result.fromArray(
          Array(lambdaTest.passes)
            .fill(0)
            .map((_, i) => i)
        ),
        resultPath: '$.Passes',
      });

      // Map will fan out and execute functions in parallel based on the `concurrency` prop.
      const lambdaMap = new Map(this, `Lambda Map ${index}`, {
        itemsPath: JsonPath.stringAt('$.Passes'),
        maxConcurrency: lambdaTest.concurrency,
        resultPath: '$.MapResult',
      });

      // Using `fromFunctionArn` supports non-CDK use cases and decouples stacks.
      lambdaMap.iterator(
        new LambdaInvoke(this, `LambdaInvoke ${index}`, {
          lambdaFunction: Function.fromFunctionArn(
            this,
            `Invoke ${index}`,
            lambdaTest.arn
          ),
          payload: TaskInput.fromObject(lambdaTest.payload),
        })
      );

      // Lambda Function grabs xray traces and parses them.
      // Requires retry because it'll throw an exception if the traces aren't available yet.
      const invokeGetTraces = new LambdaInvoke(this, `GetTraces ${index}`, {
        lambdaFunction: getTraces,
        resultPath: '$.Traces',
        retryOnServiceExceptions: true,
      });

      invokeGetTraces.addRetry({ maxAttempts: 10 });

      // Get additional stats like memory, runtime, etc from Lambda service
      const getFunctionDescription = new CallAwsService(
        this,
        `GetFunc ${index}`,
        {
          action: 'getFunction',
          iamResources: [lambdaTest.arn],
          parameters: { FunctionName: lambdaTest.arn },
          resultPath: '$.Function',
          service: 'lambda',
        }
      );

      const saveRun = new DynamoPutItem(this, `PutItem ${index}`, {
        item: {
          pk: DynamoAttributeValue.fromString(
            JsonPath.stringAt('$.Traces.Payload[0].name')
          ),
          sk: DynamoAttributeValue.fromString(
            JsonPath.format(
              '{}#{}',
              JsonPath.stringAt('$.Traces.Payload[0].date'),
              JsonPath.stringAt('$.Traces.Payload[0].name')
            )
          ),
          date: DynamoAttributeValue.fromString(
            JsonPath.stringAt('$.Traces.Payload[0].date')
          ),
          architectures: DynamoAttributeValue.fromString(
            JsonPath.stringAt('$.Function.Configuration.Architectures[0]')
          ),
          codeSize: DynamoAttributeValue.numberFromString(
            JsonPath.format(
              '{}',
              JsonPath.stringAt('$.Function.Configuration.CodeSize')
            )
          ),
          description: DynamoAttributeValue.fromString(
            JsonPath.stringAt('$.Function.Configuration.Description')
          ),
          name: DynamoAttributeValue.fromString(
            JsonPath.stringAt('$.Traces.Payload[0].name')
          ),
          memorySize: DynamoAttributeValue.numberFromString(
            JsonPath.format(
              '{}',
              JsonPath.stringAt('$.Function.Configuration.MemorySize')
            )
          ),
          runtime: DynamoAttributeValue.fromString(
            JsonPath.stringAt('$.Function.Configuration.Runtime')
          ),
          coldStartPercent: DynamoAttributeValue.numberFromString(
            JsonPath.format(
              '{}',
              JsonPath.stringAt('$.Traces.Payload[0].coldStartPercent')
            )
          ),
          averageColdStart: DynamoAttributeValue.numberFromString(
            JsonPath.format(
              '{}',
              JsonPath.stringAt('$.Traces.Payload[0].averageColdStart')
            )
          ),
          averageDuration: DynamoAttributeValue.numberFromString(
            JsonPath.format(
              '{}',
              JsonPath.stringAt('$.Traces.Payload[0].averageDuration')
            )
          ),
          p90ColdStart: DynamoAttributeValue.numberFromString(
            JsonPath.format(
              '{}',
              JsonPath.stringAt('$.Traces.Payload[0].p90ColdStart')
            )
          ),
          p90Duration: DynamoAttributeValue.numberFromString(
            JsonPath.format(
              '{}',
              JsonPath.stringAt('$.Traces.Payload[0].p90Duration')
            )
          ),
        },
        resultPath: '$.PutItem',
        table: table.dynamodbTable,
      });

      // Return the task token to the parent state machine.
      // Is there a better way to do this? Feels odd using the SDK.
      const sendSuccess = new CallAwsService(this, `SendSuccess ${index}`, {
        action: 'sendTaskSuccess',
        iamResources: ['*'],
        parameters: {
          'Output.$': '$.Traces.Payload',
          'TaskToken.$': '$.token',
        },
        service: 'sfn',
      });

      // Create nested state machine. Tracing must be enabled for this to work!
      const parallelStateMachine = new StateMachine(
        this,
        `Parallel State Machine ${index}`,
        {
          definition: pass.next(
            lambdaMap.next(
              invokeGetTraces.next(
                getFunctionDescription.next(saveRun.next(sendSuccess))
              )
            )
          ),
          tracingEnabled: true,
        }
      );

      // More weirdness with sending back the task token. The `CallAwsService` construct above will grant `sfn:SendTaskSuccess`
      // but we actually need `states:SendTaskSuccess` to perform this action. The above grant doesn't do anything.
      // Wildcard isn't terrible here - sending random task tokens to state machines shouldn't do anything,
      // but would be nice to come up with something more clever.
      parallelStateMachine.addToRolePolicy(
        new PolicyStatement({
          actions: ['states:SendTaskSuccess'],
          resources: ['*'],
        })
      );

      const executeParallel = new StepFunctionsStartExecution(
        this,
        `StepFunctionsStartExecution ${index}`,
        {
          input: TaskInput.fromObject({ token: JsonPath.taskToken }),
          integrationPattern: IntegrationPattern.WAIT_FOR_TASK_TOKEN,
          stateMachine: parallelStateMachine,
        }
      );

      parallel.branch(executeParallel);
    });

    // Parent state machine. Tracing must be disabled or we overrun the max trace size!
    new StateMachine(this, 'BenchmarkMachine', {
      definition: parallel,
      timeout: Duration.minutes(10),
    });
  }
}
