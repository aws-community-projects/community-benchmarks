import {
  Function as SSTFunction,
  Stack,
  Table,
} from '@serverless-stack/resources';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  JsonPath,
  Map,
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
} from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';

import { LambdaTest } from '../stacks/benchmark/BenchmarkMachineStack';

interface LambdaBenchmarkStateMachineProps {
  benchmarkMachineName: string;
  getTraces: SSTFunction;
  lambdaTest: LambdaTest;
  table: Table;
}

export class LambdaBenchmarkStateMachine extends Construct {
  stateMachine: StateMachine;
  constructor(
    scope: Construct,
    id: string,
    props: LambdaBenchmarkStateMachineProps
  ) {
    super(scope, id);
    const { benchmarkMachineName, lambdaTest, getTraces, table } = props;

    const parentStateMachineArn = `arn:aws:states:${Stack.of(this).region}:${
      Stack.of(this).account
    }:stateMachine:${benchmarkMachineName}`;

    // Map state requires an iterable.
    // We take the `passes` property of the test config and turn it into an array of zeros for the map state to iterate.
    const pass = new Pass(this, `Configure`, {
      result: Result.fromArray(
        Array(lambdaTest.passes)
          .fill(0)
          .map((_, i) => i)
      ),
      resultPath: '$.Passes',
    });

    // Map will fan out and execute functions in parallel based on the `concurrency` prop.
    const lambdaMap = new Map(this, `Lambda Map`, {
      itemsPath: JsonPath.stringAt('$.Passes'),
      maxConcurrency: lambdaTest.concurrency,
      resultPath: '$.MapResult',
    });

    // Using `fromFunctionArn` supports non-CDK use cases and decouples stacks.
    lambdaMap.iterator(
      new LambdaInvoke(this, `LambdaInvoke`, {
        lambdaFunction: SSTFunction.fromFunctionArn(
          this,
          `Invoke`,
          lambdaTest.arn
        ),
        payload: TaskInput.fromObject(lambdaTest.payload),
      })
    );

    // Return the task token to the parent state machine.
    const sendFailure = new CallAwsService(this, `SendFailure`, {
      action: 'sendTaskFailure',
      iamResources: [parentStateMachineArn],
      inputPath: '$',
      parameters: {
        Cause: 'No Traces Found!',
        Error: '404',
        'TaskToken.$': '$$.Execution.Input.token',
      },
      service: 'sfn',
    });

    // Lambda Function grabs xray traces and parses them.
    // Requires retry because it'll throw an exception if the traces aren't available yet.
    const invokeGetTraces = new LambdaInvoke(this, `GetTraces`, {
      lambdaFunction: getTraces,
      resultPath: '$.Traces',
      retryOnServiceExceptions: true,
    });

    invokeGetTraces.addCatch(sendFailure);
    invokeGetTraces.addRetry({ maxAttempts: 5 });

    // Get additional stats like memory, runtime, etc from Lambda service
    const getFunctionDescription = new CallAwsService(this, `GetFunc`, {
      action: 'getFunction',
      iamResources: [lambdaTest.arn],
      parameters: { FunctionName: lambdaTest.arn },
      resultPath: '$.Function',
      service: 'lambda',
    });

    const parseDescription = new Pass(this, 'ParseDescription', {
      parameters: {
        Description: JsonPath.stringToJson(
          JsonPath.stringAt('$.Function.Configuration.Description')
        ),
      },
      resultPath: '$.Function.Configuration.Description',
    });

    const saveRun = new DynamoPutItem(this, `PutItem`, {
      item: {
        pk: DynamoAttributeValue.fromString(
          JsonPath.stringAt('$.Traces.Payload.name')
        ),
        sk: DynamoAttributeValue.fromString(
          JsonPath.format(
            '{}#{}',
            JsonPath.stringAt('$.Traces.Payload.date'),
            JsonPath.stringAt('$.Traces.Payload.name')
          )
        ),
        date: DynamoAttributeValue.fromString(
          JsonPath.stringAt('$.Traces.Payload.date')
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
        format: DynamoAttributeValue.fromString(
          JsonPath.stringAt(
            '$.Function.Configuration.Description.Description.format'
          )
        ),
        minify: DynamoAttributeValue.booleanFromJsonPath(
          JsonPath.stringAt(
            '$.Function.Configuration.Description.Description.minify'
          )
        ),
        sdk: DynamoAttributeValue.fromString(
          JsonPath.stringAt(
            '$.Function.Configuration.Description.Description.sdk'
          )
        ),
        xray: DynamoAttributeValue.booleanFromJsonPath(
          JsonPath.stringAt(
            '$.Function.Configuration.Description.Description.xray'
          )
        ),
        name: DynamoAttributeValue.fromString(
          JsonPath.stringAt('$.Traces.Payload.name')
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
            JsonPath.stringAt('$.Traces.Payload.coldStartPercent')
          )
        ),
        averageColdStart: DynamoAttributeValue.numberFromString(
          JsonPath.format(
            '{}',
            JsonPath.stringAt('$.Traces.Payload.averageColdStart')
          )
        ),
        averageDuration: DynamoAttributeValue.numberFromString(
          JsonPath.format(
            '{}',
            JsonPath.stringAt('$.Traces.Payload.averageDuration')
          )
        ),
        iterations: DynamoAttributeValue.numberFromString(
          JsonPath.format(
            '{}',
            JsonPath.stringAt('$.Traces.Payload.iterations')
          )
        ),
        p90ColdStart: DynamoAttributeValue.numberFromString(
          JsonPath.format(
            '{}',
            JsonPath.stringAt('$.Traces.Payload.p90ColdStart')
          )
        ),
        p90Duration: DynamoAttributeValue.numberFromString(
          JsonPath.format(
            '{}',
            JsonPath.stringAt('$.Traces.Payload.p90Duration')
          )
        ),
      },
      resultPath: '$.PutItem',
      table: table.dynamodbTable,
    });

    // Return the task token to the parent state machine.
    const sendSuccess = new CallAwsService(this, `SendSuccess`, {
      action: 'sendTaskSuccess',
      iamResources: [parentStateMachineArn],
      parameters: {
        'Output.$': '$.Traces.Payload',
        'TaskToken.$': '$.token',
      },
      service: 'sfn',
    });

    this.stateMachine = new StateMachine(this, 'LambdaBenchmarkStateMachine', {
      definition: pass.next(
        lambdaMap.next(
          invokeGetTraces.next(
            getFunctionDescription.next(
              parseDescription.next(saveRun.next(sendSuccess))
            )
          )
        )
      ),
      tracingEnabled: true,
    });

    // Unable to use `grantTaskResponse` because it introduces a circular dependency.
    this.stateMachine.addToRolePolicy(
      new PolicyStatement({
        actions: ['states:SendTaskFailure', 'states:SendTaskSuccess'],
        resources: [parentStateMachineArn],
      })
    );
  }
}
