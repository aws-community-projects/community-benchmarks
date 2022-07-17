import React, { useEffect, useMemo, useState } from 'react';
import { AxisOptions, Chart } from 'react-charts';
import { getBenchmarks } from '../utils';
import Dimensions from './Dimensions';
import FilterControls from './FilterControls';

type Benchmark = {
  averageDuration: number;
  architecture: string;
  runtime: string;
  codeSize: number;
  iterations: number;
  minify: boolean;
  name: string;
  coldStartPercent: number;
  date: string;
  averageColdStart: number;
  sourceType: string;
  xray: boolean;
  memorySize: number;
  p90Duration: number;
  sdk: string;
  p90ColdStartPercent: number;
  format: string;
};

interface BaseFilter {
  dimension: keyof Benchmark;
}

interface BooleanFilter extends BaseFilter {
  kind: 'boolean';
  value: boolean;
}

interface NumberFilter extends BaseFilter {
  kind: 'number';
  max: number;
  min: number;
}

interface StringFilter extends BaseFilter {
  kind: 'string';
  value: string;
}

type Filter = BooleanFilter | NumberFilter | StringFilter;

type Series = { label: string; data: Benchmark[] };

const App = () => {
  const [dimension, setDimension] = useState('averageDuration');
  const [series, setSeries] = useState([] as Series[]);
  const [filters, setFilters] = useState({} as Filter[]);

  useEffect(() => {
    getBenchmarks().then((b: { Items: Benchmark[] }) => {
      const obj = b.Items.reduce((p, c) => {
        const name = c.name;
        return { ...p, [name]: p[name] ? [...p[name], c] : [c] };
      }, []);
      setFilters([
        // { dimension: 'xray', kind: 'boolean', value: false },
        { dimension: 'runtime', kind: 'string', value: 'nodejs16.x' },
      ]);
      setSeries(
        Object.entries(obj).map(([k, v]: [string, Benchmark[]]) => ({
          label: k,
          data: v,
        }))
      );
    });
  }, []);

  const primaryAxis = useMemo(
    (): AxisOptions<Benchmark> => ({
      getValue: (datum) => datum.date,
    }),
    []
  );

  const secondaryAxes = useMemo(
    (): AxisOptions<Benchmark>[] => [
      {
        getValue: (datum) => datum[dimension],
        elementType: 'line',
      },
    ],
    [dimension]
  );

  const data = useMemo(
    () =>
      series.filter((s) => {
        let filtered = false;
        filters.forEach((f) => {
          switch (f.kind) {
            case 'boolean':
            case 'string':
              if (s.data[0][f.dimension] !== f.value) {
                filtered = true;
              }
              break;
          }
        });
        return !filtered;
      }),
    [filters, series]
  );

  return (
    <div style={{ height: 800 }}>
      <Dimensions dimension={dimension} setDimension={setDimension} />
      <FilterControls />
      {data.length && (
        <Chart
          options={{
            data,
            primaryAxis,
            secondaryAxes,
          }}
        />
      )}
    </div>
  );
};

export default App;
