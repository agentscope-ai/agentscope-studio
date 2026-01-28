import { EChartsSankey } from './EChartsSankey';
import { ReactEChartsSankey } from './ReactEChartsSankey';
import { PlotlySankey } from './PlotlySankey';
import { D3Sankey } from './D3Sankey';
import { D3AdvancedSankey } from './D3AdvancedSankey';
import type { SankeyChartProps, ChartLibrary } from './types';

export const SankeyChartFactory: React.FC<
    SankeyChartProps & { library: ChartLibrary }
> = ({ library, ...props }) => {
    switch (library) {
        case 'echarts':
            return <EChartsSankey {...props} />;
        case 'reactecharts':
            return <ReactEChartsSankey {...props} />;
        case 'plotly':
            return <PlotlySankey {...props} />;
        case 'd3':
            return <D3Sankey {...props} />;
        case 'd3sankey':
            return <D3AdvancedSankey {...props} />;
        default:
            return <EChartsSankey {...props} />;
    }
};

export { EChartsSankey, ReactEChartsSankey, PlotlySankey, D3Sankey, D3AdvancedSankey };
export type { SankeyChartProps, ChartLibrary } from './types';
