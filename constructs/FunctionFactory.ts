import {
  Function as SSTFunction,
  FunctionProps,
  Stack,
} from '@serverless-stack/resources';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { findImportsSync } from 'find-imports-ts';

export enum NodeJSSDKOptions {
  SDKV2_BUNDLED = 'sdk2',
  SDKV2_BUNDLED_CLIENTS = 'sdk2-clients',
  SDKV2_EXTERNAL = 'sdk2-external',
  SDKV2_EXTERNAL_CLIENTS = 'sdk2-external-clients',
  SDKV2_MODULES = 'sdk2-modules',
  SDKV2_MODULES_CLIENTS = 'sdk2-clients',
  SDKV3_BUNDLED = 'sdk3',
  SDKV3_MODULES = 'sdk3-modules',
}

interface FunctionVariation {
  architecture: Architecture;
  format: 'cjs' | 'esm';
  memorySize: number;
  minify: boolean;
  sdk: NodeJSSDKOptions;
  xray: boolean;
}

interface Variations {
  architecture?: Architecture[];
  format?: ('cjs' | 'esm')[];
  memorySize?: number[];
  minify?: boolean[];
  sdk: NodeJSSDKOptions[];
  xray?: boolean[];
}

type VariationTypes =
  | string[]
  | ('cjs' | 'esm')[]
  | boolean[]
  | NodeJSSDKOptions[];

interface BenchmarkFunctionProps {
  extension: 'js' | 'mjs' | 'ts';
  name: string;
  variations: Variations;
}

interface FunctionFactoryProps {
  defaultFunctionProps: FunctionProps;
  fns: BenchmarkFunctionProps[];
  scope: Stack;
}

// thanks https://stackoverflow.com/questions/43055569/all-combinations-of-of-an-object-with-array-values-for-its-keys
const getVariations = (variations: Variations): FunctionVariation[] =>
  (function recurse(keys): FunctionVariation[] {
    if (!keys.length) return [{} as FunctionVariation];
    const result = recurse(keys.slice(1));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(variations as Record<string, any>)[keys[0]].length) {
      return result;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (variations as Record<string, any>)[keys[0]].reduce(
      (acc: FunctionVariation[], value: VariationTypes) =>
        acc.concat(
          result.map((item: FunctionVariation) =>
            Object.assign({}, item, { [keys[0]]: value })
          )
        ),
      []
    );
  })(Object.keys(variations));

const buildFunction = (
  scope: Stack,
  benchmarkProps: BenchmarkFunctionProps,
  variation: FunctionVariation,
  defaultProps: FunctionProps
): SSTFunction => {
  const { extension, name } = benchmarkProps;
  const {
    architecture = Architecture.ARM_64,
    format = 'esm',
    memorySize = 128,
    minify = true,
    sdk,
    xray = false,
  } = variation;
  const modules = useModules(sdk);
  const fileName = `${name}-${sdk}${xray ? '-xray' : ''}`;
  const functionName = `${fileName}-${architecture.name}-${format}${
    minify ? '-minify' : ''
  }-${memorySize}`;
  new LogGroup(scope, `LG-${functionName}`, {
    logGroupName: `/aws/lambda/${functionName}`,
    retention: RetentionDays.ONE_DAY,
    removalPolicy: RemovalPolicy.DESTROY,
  });
  return new SSTFunction(scope, functionName, {
    ...defaultProps,
    architecture,
    bundle: {
      format,
      minify,
      nodeModules: modules
        ? getImports(`${defaultProps.srcPath}/${fileName}.${extension}`)
        : [],
    },
    description: JSON.stringify(variation),
    functionName,
    handler: `${fileName}.handler`,
    memorySize,
  });
};

const getImports = (path: string): string[] =>
  Array.from(findImportsSync(path))
    .filter((i) => !i.startsWith('.'))
    .map((i) =>
      i.startsWith('@')
        ? `${i.split('/')[0]}/${i.split('/')[1]}`
        : i.split('/')[0]
    );

const useModules = (sdk: NodeJSSDKOptions): boolean =>
  [NodeJSSDKOptions.SDKV2_MODULES, NodeJSSDKOptions.SDKV3_MODULES].includes(
    sdk
  );

export const buildFunctions = (props: FunctionFactoryProps): SSTFunction[] => {
  const { defaultFunctionProps, fns, scope } = props;
  return fns.flatMap((fn) => {
    const variations = getVariations(fn.variations);
    return variations.map((variation) =>
      buildFunction(scope, fn, variation, defaultFunctionProps)
    );
  });
};
