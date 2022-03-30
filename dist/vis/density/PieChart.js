import * as d3 from 'd3v7';
import { uniqueId } from 'lodash';
import * as React from 'react';
import { useMemo } from 'react';
export function PieChart({ data, dataCategories, radius, transform, colorScale }) {
    const pie = useMemo(() => {
        return d3.pie();
    }, []);
    const arc = useMemo(() => {
        return d3.arc().innerRadius(0).outerRadius(radius);
    }, [radius]);
    const id = React.useMemo(() => uniqueId('PieNum'), []);
    return (React.createElement("g", { style: { transform } }, pie(data).map((slice, i) => {
        // TODO: Why are indexes bad in the key? how else to do this?
        // eslint-disable-next-line react/no-array-index-key
        return React.createElement("path", { key: `${id}, ${i}`, d: arc(slice), style: { fill: colorScale ? colorScale(dataCategories[i]) : 'cornflowerblue' } });
    })));
}
//# sourceMappingURL=PieChart.js.map