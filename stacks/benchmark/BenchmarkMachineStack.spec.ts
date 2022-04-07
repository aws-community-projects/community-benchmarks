import * as sst from '@serverless-stack/resources';
import { Template } from 'aws-cdk-lib/assertions';

import { BenchmarkMachineStack } from './BenchmarkMachineStack';

test('BenchmarkMachineStack', () => {
  const app = new sst.App();
  const stack = new BenchmarkMachineStack(app, 'test-stack', {
    lambdaTests: [
      {
        arn: 'arn:aws:lambda:us-east-9:987654321:function:test-func1',
        concurrency: 5,
        passes: 10,
        payload: {},
      },
      {
        arn: 'arn:aws:lambda:us-east-9:987654321:function:test-func2',
        concurrency: 5,
        passes: 10,
        payload: {},
      },
      {
        arn: 'arn:aws:lambda:us-east-9:987654321:function:test-func3',
        concurrency: 5,
        passes: 10,
        payload: {},
      },
    ],
  });
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Lambda::Function', 1);
  template.resourceCountIs('AWS::StepFunctions::StateMachine', 4);
  expect(template.toJSON()).toMatchSnapshot();
});
