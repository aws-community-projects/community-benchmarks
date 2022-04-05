import { App } from '@serverless-stack/resources';

import { BenchmarkMachineStack } from './benchmark/BenchmarkMachineStack';
import { Csv2DdbStack } from './test-stacks/Csv2DdbStack';

const main = (app: App): void => {
  app.setDefaultFunctionProps({
    runtime: 'nodejs14.x',
  });

  // Stack under test exports Lambda functions.
  const csv2Ddb = new Csv2DdbStack(app, 'Csv2DdbStack');

  // Benchmark stack takes functions as an arg.
  new BenchmarkMachineStack(app, 'BenchmarkMachineStack', {
    lambdaTests: csv2Ddb.lambdaTests,
  });
};

export default main;
