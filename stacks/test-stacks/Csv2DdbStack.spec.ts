import * as sst from '@serverless-stack/resources';
import { Template } from 'aws-cdk-lib/assertions';

import { Csv2DdbStack } from './Csv2DdbStack';

beforeAll(() => {
  jest.useFakeTimers('modern');
  jest.setSystemTime(new Date(2020, 3, 1));
});

afterAll(() => {
  jest.useRealTimers();
});

test('Csv2DdbStack', () => {
  const app = new sst.App();
  const stack = new Csv2DdbStack(app, 'test-stack');
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::DynamoDB::Table', 1);
  template.resourceCountIs('AWS::Lambda::Function', 18);
  template.resourceCountIs('AWS::S3::Bucket', 1);
  expect(template.toJSON()).toMatchSnapshot();
});
