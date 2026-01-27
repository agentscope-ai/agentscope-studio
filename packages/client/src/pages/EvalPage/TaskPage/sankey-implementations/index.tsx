import { EChartsSankey } from './EChartsSankey';
import { PlotlySankey } from './PlotlySankey';
import { D3Sankey } from './D3Sankey';
import { GoogleSankey } from './GoogleSankey';
import { SankeyChartProps, ChartLibrary } from './types';

export const SankeyChartFactory: React.FC<
    SankeyChartProps & { library: ChartLibrary }
> = ({ library, ...props }) => {
    switch (library) {
        case 'echarts':
            return <EChartsSankey {...props} />;
        case 'plotly':
            return <PlotlySankey {...props} />;
        case 'd3':
            return <D3Sankey {...props} />;
        case 'google':
            return <GoogleSankey {...props} />;
        default:
            return <EChartsSankey {...props} />;
    }
};

export { EChartsSankey, PlotlySankey, D3Sankey, GoogleSankey };
export type { SankeyChartProps, ChartLibrary } from './types';
