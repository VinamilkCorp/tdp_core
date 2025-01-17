import { LocalDataProvider } from 'lineupjs';
export declare class LineupVisWrapper {
    protected readonly props: {
        provider: LocalDataProvider;
        /**
         * Callback when the selection in a vis changed.
         * @param visynIds Selected visyn ids.
         */
        selectionCallback(visynIds: string[]): void;
        doc: Document;
        idField?: string;
    };
    /**
     * This string is assigned if a categorical value is missing and rendered by Plotly.
     */
    private PLOTLY_CATEGORICAL_MISSING_VALUE;
    readonly node: HTMLElement;
    private viewable;
    private idField;
    constructor(props: {
        provider: LocalDataProvider;
        /**
         * Callback when the selection in a vis changed.
         * @param visynIds Selected visyn ids.
         */
        selectionCallback(visynIds: string[]): void;
        doc: Document;
        idField?: string;
    });
    getSelectedList: () => string[];
    filterCallback: (s: string) => void;
    updateCustomVis: () => void;
    toggleCustomVis: () => void;
    hide: () => void;
}
//# sourceMappingURL=LineupVisWrapper.d.ts.map