import * as React from 'react';
import d3 from 'd3';
import { useMemo, useEffect } from 'react';
import { ESupportedPlotlyVis, ENumericalColorScaleType, EColumnTypes, EBarDirection, EBarDisplayType, EBarGroupingType, EScatterSelectSettings, EAggregateTypes, } from './interfaces';
import { isScatter, scatterMergeDefaultConfig, ScatterVis } from './scatter';
import { barMergeDefaultConfig, isBar, BarVis } from './bar';
import { isViolin, violinMergeDefaultConfig, ViolinVis } from './violin';
import { isStrip, stripMergeDefaultConfig, StripVis } from './strip';
import { isPCP, pcpMergeDefaultConfig, PCPVis } from './pcp';
import { getCssValue } from '../utils';
const DEFAULTCOLORS = [
    getCssValue('visyn-c1'),
    getCssValue('visyn-c2'),
    getCssValue('visyn-c3'),
    getCssValue('visyn-c4'),
    getCssValue('visyn-c5'),
    getCssValue('visyn-c6'),
    getCssValue('visyn-c7'),
    getCssValue('visyn-c8'),
    getCssValue('visyn-c9'),
    getCssValue('visyn-c10'),
];
const DEFAULTSHAPES = ['circle', 'square', 'triangle-up', 'star'];
export function Vis({ columns, selected = [], colors = DEFAULTCOLORS, shapes = DEFAULTSHAPES, selectionCallback = () => null, filterCallback = () => null, externalConfig = null, hideSidebar = false, }) {
    // Each time you switch between vis config types, there is one render where the config is inconsistent with the type before the merge functions in the useEffect below can be called.
    // To ensure that we never render an incosistent config, keep a consistent and a current in the config. Always render the consistent.
    // TODO:: probably change the names, especially "current" and "inconsistentVisConfig" to something more useful.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const [{ consistent: visConfig, current: inconsistentVisConfig }, _setVisConfig] = React.useState(externalConfig
        ? { consistent: null, current: externalConfig }
        : columns.filter((c) => c.type === EColumnTypes.NUMERICAL).length > 1
            ? {
                consistent: null,
                current: {
                    type: ESupportedPlotlyVis.SCATTER,
                    numColumnsSelected: [],
                    color: null,
                    numColorScaleType: ENumericalColorScaleType.SEQUENTIAL,
                    shape: null,
                    dragMode: EScatterSelectSettings.RECTANGLE,
                    alphaSliderVal: 0.5,
                },
            }
            : {
                consistent: null,
                current: {
                    type: ESupportedPlotlyVis.BAR,
                    multiples: null,
                    group: null,
                    direction: EBarDirection.VERTICAL,
                    display: EBarDisplayType.ABSOLUTE,
                    groupType: EBarGroupingType.STACK,
                    numColumnsSelected: [],
                    catColumnSelected: null,
                    aggregateColumn: null,
                    aggregateType: EAggregateTypes.COUNT,
                },
            });
    const setVisConfig = React.useCallback((newConfig) => {
        _setVisConfig((oldConfig) => {
            return {
                current: newConfig,
                consistent: oldConfig.current.type !== newConfig.type ? oldConfig.consistent : newConfig,
            };
        });
    }, []);
    React.useEffect(() => {
        if (isScatter(inconsistentVisConfig)) {
            const newConfig = scatterMergeDefaultConfig(columns, inconsistentVisConfig);
            _setVisConfig({ current: newConfig, consistent: newConfig });
        }
        if (isViolin(inconsistentVisConfig)) {
            const newConfig = violinMergeDefaultConfig(columns, inconsistentVisConfig);
            _setVisConfig({ current: newConfig, consistent: newConfig });
        }
        if (isStrip(inconsistentVisConfig)) {
            const newConfig = stripMergeDefaultConfig(columns, inconsistentVisConfig);
            _setVisConfig({ current: newConfig, consistent: newConfig });
        }
        if (isPCP(inconsistentVisConfig)) {
            const newConfig = pcpMergeDefaultConfig(columns, inconsistentVisConfig);
            _setVisConfig({ current: newConfig, consistent: newConfig });
        }
        if (isBar(inconsistentVisConfig)) {
            const newConfig = barMergeDefaultConfig(columns, inconsistentVisConfig);
            _setVisConfig({ current: newConfig, consistent: newConfig });
        }
        // DANGER:: this useEffect should only occur when the visConfig.type changes. adding visconfig into the dep array will cause an infinite loop.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inconsistentVisConfig.type, columns]);
    useEffect(() => {
        if (externalConfig) {
            setVisConfig(externalConfig);
        }
    }, [externalConfig, setVisConfig]);
    const selectedMap = useMemo(() => {
        const currMap = {};
        selected.forEach((s) => {
            currMap[s] = true;
        });
        return currMap;
    }, [selected]);
    const scales = useMemo(() => {
        const colorScale = d3.scale.ordinal().range(colors);
        return {
            color: colorScale,
        };
    }, [colors]);
    if (!visConfig) {
        return React.createElement("div", { className: "tdp-busy" });
    }
    return (React.createElement(React.Fragment, null,
        isScatter(visConfig) ? (React.createElement(ScatterVis, { config: visConfig, optionsConfig: {
                color: {
                    enable: true,
                },
            }, shapes: shapes, setConfig: setVisConfig, filterCallback: filterCallback, selectionCallback: selectionCallback, selected: selectedMap, columns: columns, scales: scales, hideSidebar: hideSidebar })) : null,
        isViolin(visConfig) ? (React.createElement(ViolinVis, { config: visConfig, optionsConfig: {
                overlay: {
                    enable: true,
                },
            }, setConfig: setVisConfig, columns: columns, scales: scales, hideSidebar: hideSidebar })) : null,
        isStrip(visConfig) ? (React.createElement(StripVis, { config: visConfig, selectionCallback: selectionCallback, setConfig: setVisConfig, selected: selectedMap, columns: columns, scales: scales, hideSidebar: hideSidebar })) : null,
        isPCP(visConfig) ? React.createElement(PCPVis, { config: visConfig, selected: selectedMap, setConfig: setVisConfig, columns: columns, hideSidebar: hideSidebar }) : null,
        isBar(visConfig) ? React.createElement(BarVis, { config: visConfig, setConfig: setVisConfig, columns: columns, scales: scales, hideSidebar: hideSidebar }) : null));
}
//# sourceMappingURL=Vis.js.map