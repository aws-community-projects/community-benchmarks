import { App } from '@serverless-stack/resources';
import { Template } from 'aws-cdk-lib/assertions';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';

import { Csv2DdbStack } from './Csv2DdbStack';

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2020, 3, 1));
});

afterAll(() => {
  vi.useRealTimers();
});

test('Csv2DdbStack', () => {
  const app = new App();
  const stack = new Csv2DdbStack(app, 'test-stack');
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::DynamoDB::Table', 1);
  template.resourceCountIs('AWS::Lambda::Function', 23);
  template.resourceCountIs('AWS::S3::Bucket', 1);
  expect(template.toJSON()).toMatchSnapshot();
});
