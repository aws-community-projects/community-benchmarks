import { BatchGetTracesCommand, XRayClient } from '@aws-sdk/client-xray';
import { mockClient } from 'aws-sdk-client-mock';

import trace from '../../sample-trace.json';
import { handler } from './get-traces';

const xrayMock = mockClient(XRayClient);

const mockFnResult = {
  SdkHttpMetadata: {
    HttpHeaders: {
      ['X-Amzn-Trace-Id']:
        'root=FAKE_TRACE_ID;parent=1234567890abcdef;sampled=1',
    },
  },
};

beforeEach(() => xrayMock.reset());

describe('get-traces function', () => {
  test('fetch and parse traces', async () => {
    xrayMock.on(BatchGetTracesCommand).resolves(trace);

    const result = await handler({
      MapResult: Array(10).fill(mockFnResult),
      token: 'FAKE_TASK_TOKEN',
    });
    expect(result).toMatchSnapshot();
  });

  test('throw exception if no traces', async () => {
    xrayMock.on(BatchGetTracesCommand).resolves({ Traces: [] });
    try {
      await handler({
        MapResult: Array(10).fill(mockFnResult),
        token: 'FAKE_TASK_TOKEN',
      });
    } catch (e) {
      expect((e as Error).message).toBe('No traces!');
    }
  });

  test('throw exception if not all traces have arrived', async () => {
    xrayMock.on(BatchGetTracesCommand).resolves({ Traces: [{}] });
    try {
      await handler({
        MapResult: Array(10).fill(mockFnResult),
        token: 'FAKE_TASK_TOKEN',
      });
    } catch (e) {
      expect((e as Error).message).toBe('In Progress');
    }
  });
});
