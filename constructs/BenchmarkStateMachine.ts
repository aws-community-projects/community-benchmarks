import { Function, Table, TableFieldType } from '@serverless-stack/resources';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Tracing } from 'aws-cdk-lib/aws-lambda';
import {
  IntegrationPattern,
  JsonPath,
  Parallel,
  StateMachine,
  TaskInput,
} from 'aws-cdk-lib/aws-stepfunctions';
import { StepFunctionsStartExecution } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';

import { LambdaTest } from '../stacks/benchmark/BenchmarkMachineStack';
import { LambdaBenchmarkStateMachine } from './LambdaBenchmarkStateMachine';

interface BenchmarkStateMachineProps {
  lambdaTests: LambdaTest[];
}

export class BenchmarkStateMachine extends Construct {
  constructor(scope: Construct, id: string, props: BenchmarkStateMachineProps) {
    super(scope, id);
    const stateMachineName = 'benchmark-machine';

    const table = new Table(scope, 'BenchmarksTable', {
      dynamodbTable: {
        billingMode: BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.DESTROY,
        tableName: 'Benchmarks',
      },
      fields: { pk: TableFieldType.STRING, sk: TableFieldType.STRING },
      primaryIndex: { partitionKey: 'pk', sortKey: 'sk' },
    });

    // Declare get-traces function with permission to grab xray traces.
    const getTraces = new Function(scope, 'GetTraces', {
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
    const parallel = new Parallel(scope, 'Parallel Execution');

    // Loop over functions to test. We will create a new nested state machine for each function.
    props.lambdaTests.forEach((lambdaTest, index) => {
      const parallelStateMachine = new LambdaBenchmarkStateMachine(
        scope,
        `LambdaBenchmarkSM ${index}`,
        { benchmarkMachineName: stateMachineName, getTraces, lambdaTest, table }
      );

      const executeParallel = new StepFunctionsStartExecution(
        scope,
        `ParallelBenchmarkMachine ${index}`,
        {
          input: TaskInput.fromObject({ token: JsonPath.taskToken }),
          integrationPattern: IntegrationPattern.WAIT_FOR_TASK_TOKEN,
          stateMachine: parallelStateMachine.stateMachine,
        }
      );

      parallel.branch(executeParallel);
    });

    new StateMachine(this, 'BenchmarkStateMachine', {
      definition: parallel,
      stateMachineName,
      timeout: Duration.minutes(10),
    });
  }
}
