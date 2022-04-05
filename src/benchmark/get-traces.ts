import { BatchGetTracesCommand, XRayClient } from '@aws-sdk/client-xray';
import { quantile } from './utils';

const client = new XRayClient({});

// Kind of useful. Any lib provide this?
type functionArn = `arn:aws:lambda:${string}:${number}:function:${string}`;

// Define the stats we want to collect
// Potential to add custom trace segments here!
interface Stat {
  averageDuration: number;
  averageColdStart: number;
  coldStartPercent: number;
  durations: number[];
  inits: number[];
  p90Duration: number;
  p90ColdStart: number;
}

// Maybe don't need this?
// I was thinking we might collect stats from multiple functions in a single go, but that seems infeasible due to xray limits.
interface Stats {
  [name: string]: Stat;
}

// Custom event passed to this function.
interface GetTracesEvent {
  MapResult: SfnState[];
  token: string;
}

// Abbreviated way to get to the trace id for the state machine execution.
// Could possibly be simplified in ASL.
interface SfnState {
  SdkHttpMetadata: {
    HttpHeaders: {
      'X-Amzn-Trace-Id': string;
    };
  };
}

// Created types for SubSegment and Document because the sdk returns stringified JSON and no type is available.
interface SubSegment {
  aws: {
    function_arn: functionArn;
  };
  end_time: number;
  id: string;
  name: 'Initialization' | 'Invocation';
  start_time: number;
}

interface TraceDocument {
  aws: {
    account_id: string;
    function_arn: functionArn;
    resource_names: string[];
  };
  end_time: number;
  id: string;
  in_progress: boolean;
  name: string;
  origin: string;
  parent_id: string;
  start_time: number;
  subsegments: SubSegment[];
  trace_id: string;
}

// TODO: Break out some of these functions into utils!
export const handler = async (event: GetTracesEvent): Promise<Stat[]> => {
  // The actual trace we need is embedded in this header.
  const traceString =
    event.MapResult[0].SdkHttpMetadata.HttpHeaders['X-Amzn-Trace-Id'];
  const traceId = traceString.split(';')[0].split('=')[1];

  const command = new BatchGetTracesCommand({ TraceIds: [traceId] });

  const traces = (await client.send(command)).Traces || [];

  if (!traces.length) {
    throw new Error('No traces!');
  }

  // Extract and parse the Documents.
  const docs =
    traces[0].Segments?.map(
      (seg) => JSON.parse(seg.Document || '') as TraceDocument
    ) || [];

  // Only looking for Lambda Function traces (not `AWS::Lambda` which is the trace of the Lambda service).
  // Don't want the trace for prior iteration of this function.
  const fns = docs.filter(
    (doc) =>
      doc.name !== 'get-traces' &&
      doc.origin === 'AWS::Lambda::Function' &&
      !doc.in_progress
  );

  // Traces are eventually consistent. We expect to find as many function traces as we have input functions.
  // Failing this, throw the error for retry.
  if (fns.length !== event.MapResult.flat().length) {
    throw new Error(`In Progress`);
  }

  // Create stat blocks to be populated.
  const emptyStats = [...new Set(fns.map((f) => f.name))].reduce(
    (prev, curr) => ({
      ...prev,
      [curr]: {
        averageColdStart: 0,
        averageDuration: 0,
        coldStartPercent: 0,
        durations: [],
        name: curr,
        inits: [],
        p90ColdStart: 0,
        p90Duration: 0,
      },
    }),
    {} as Stats
  );

  // Populating `durations` and `inits`.
  // Traces include labels: `Invocation`, `Initialization` and `Overhead`. Ignoring Overhead for now.
  // Other traces like instrumented SDK calls could go here as well.
  const collectedStats = fns.reduce(
    (prev, curr) => ({
      ...prev,
      [curr.name]: {
        ...prev[curr.name],
        durations: [
          ...prev[curr.name].durations,
          curr.subsegments
            .filter((s) => s.name === 'Invocation')
            .map((i) => (i.end_time - i.start_time) * 1000)[0],
        ],
        inits: [
          ...prev[curr.name].inits,
          curr.subsegments
            .filter((s) => s.name === 'Initialization')
            .map((i) => (i.end_time - i.start_time) * 1000)[0] || 0,
        ],
      },
    }),
    emptyStats
  );

  const computedStats = Object.keys(collectedStats).map((name): Stat => {
    const stat = collectedStats[name];
    // If `init` is `0` then it wasn't a cold start.
    const coldStarts = stat.inits.filter((init) => init > 0);

    // Determine averages and p90 as well as the percent of cold starts and return it.
    return {
      ...stat,
      averageColdStart: quantile(coldStarts, 0.5),
      averageDuration: quantile(stat.durations, 0.5),
      coldStartPercent: (coldStarts.length / stat.inits.length) * 100,
      p90ColdStart: quantile(coldStarts, 0.9),
      p90Duration: quantile(stat.durations, 0.9),
    };
  });

  return computedStats;
};
