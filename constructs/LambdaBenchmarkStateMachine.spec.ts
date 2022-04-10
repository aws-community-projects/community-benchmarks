import {
  App,
  Function,
  Stack,
  Table,
  TableFieldType,
} from '@serverless-stack/resources';
import { Template } from 'aws-cdk-lib/assertions';

import lambdaTests from '../fixtures/lambda-tests';
import { LambdaBenchmarkStateMachine } from './LambdaBenchmarkStateMachine';

test('BenchmarkStateMachine', () => {
  const app = new App();
  const stack = new Stack(app, 'test-stack');
  new LambdaBenchmarkStateMachine(stack, 'test-machine', {
    benchmarkMachineName: 'benchmark-machine',
    getTraces: new Function(stack, 'GetTraces', {
      handler: 'get-traces.handler',
      srcPath: 'src/benchmark',
    }),
    lambdaTest: lambdaTests[0],
    table: new Table(stack, 'BenchmarksTable', {
      fields: { pk: TableFieldType.STRING, sk: TableFieldType.STRING },
      primaryIndex: { partitionKey: 'pk', sortKey: 'sk' },
    }),
  });
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
  expect(template.toJSON()).toMatchSnapshot();
});
