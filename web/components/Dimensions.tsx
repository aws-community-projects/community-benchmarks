import React from 'react';

const dimensions = [
  'averageDuration',
  'averageColdStart',
  'codeSize',
  'p90Duration',
  'p90ColdStart',
];

type DimensionsProps = {
  dimension: string;
  setDimension: (dimension: string) => void;
};

const Dimensions = (props: DimensionsProps) => {
  const { dimension, setDimension } = props;
  return (
    <div>
      Dimension:
      <select onChange={(e) => setDimension(e.target.value)} value={dimension}>
        {dimensions.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>
    </div>
  );
};

export default Dimensions;
