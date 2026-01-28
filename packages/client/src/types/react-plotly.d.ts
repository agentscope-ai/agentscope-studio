declare module 'react-plotly.js' {
    import { Component } from 'react';
    import { Data, Layout, Config } from 'plotly.js';

    interface PlotParams {
        data: Data[];
        layout?: Partial<Layout>;
        config?: Partial<Config>;
        style?: React.CSSProperties;
        className?: string;
        onInitialized?: (figure: any, graphDiv: HTMLElement) => void;
        onUpdate?: (figure: any, graphDiv: HTMLElement) => void;
        onPurge?: (figure: any, graphDiv: HTMLElement) => void;
        onError?: (err: Error) => void;
        onClick?: (event: any) => void;
        onHover?: (event: any) => void;
        onUnhover?: (event: any) => void;
        debug?: boolean;
        useResizeHandler?: boolean;
        revision?: number;
    }

    export default class Plot extends Component<PlotParams> {}
}
