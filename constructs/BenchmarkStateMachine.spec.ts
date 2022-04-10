import { App, Stack } from '@serverless-stack/resources';
import { Template } from 'aws-cdk-lib/assertions';
import lambdaTests from '../fixtures/lambda-tests';
import { BenchmarkStateMachine } from './BenchmarkStateMachine';

test('BenchmarkStateMachine', () => {
  const app = new App();
  const stack = new Stack(app, 'test-stack');
  new BenchmarkStateMachine(stack, 'test-machine', {
    lambdaTests,
  });
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Lambda::Function', 1);
  template.resourceCountIs('AWS::StepFunctions::StateMachine', 4);
  expect(template.toJSON()).toMatchSnapshot();
});
