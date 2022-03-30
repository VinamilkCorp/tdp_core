import * as React from 'react';
import { useMemo } from 'react';

// code taken from https://wattenberger.com/blog/react-and-d3
export function YAxis({ yScale, xRange, horizontalPosition }) {
  const ticks = useMemo(() => {
    return yScale.ticks(5).map((value) => ({
      value,
      yOffset: yScale(value),
    }));
  }, [yScale]);

  return (
    <>
      <path
        transform={`translate(${horizontalPosition}, 0)`}
        d={['M', 0, yScale.range()[0], 'V', yScale.range()[1]].join(' ')}
        fill="none"
        stroke="currentColor"
      />
      {ticks.map(({ value, yOffset }) => (
        <g key={value} transform={`translate(${horizontalPosition}, ${yOffset})`}>
          <line x2="-6" stroke="currentColor" />
          <line x2={`${xRange[1] - xRange[0]}`} stroke={`${value === 0 ? 'black' : 'lightgray'}`} />
          <text
            key={value}
            style={{
              dominantBaseline: 'middle',
              fontSize: '10px',
              textAnchor: 'end',
              transform: 'translateX(-8px)',
            }}
          >
            {value}
          </text>
        </g>
      ))}
    </>
  );
}
