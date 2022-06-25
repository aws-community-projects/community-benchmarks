import { Stack, StackProps } from '@serverless-stack/resources';
import { Construct } from 'constructs';

import { BenchmarkStateMachine } from '../../constructs/BenchmarkStateMachine';
import { CfnResourceCollection } from 'aws-cdk-lib/aws-devopsguru';

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

    new BenchmarkStateMachine(this, 'BenchmarkStateMachine', {
      lambdaTests,
    });
  }
}
