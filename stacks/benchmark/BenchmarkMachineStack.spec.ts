import { App } from '@serverless-stack/resources';
import { Template } from 'aws-cdk-lib/assertions';
import { expect, test } from 'vitest';

import lambdaTests from '../../fixtures/lambda-tests';
import { BenchmarkMachineStack } from './BenchmarkMachineStack';

test('BenchmarkMachineStack', () => {
  const app = new App();
  const stack = new BenchmarkMachineStack(app, 'test-stack', {
    lambdaTests,
  });
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Lambda::Function', 1);
  template.resourceCountIs('AWS::StepFunctions::StateMachine', 10);
  expect(template.toJSON()).toMatchSnapshot();
});
