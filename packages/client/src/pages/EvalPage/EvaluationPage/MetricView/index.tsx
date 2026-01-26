import { memo, useMemo } from 'react';
import { MetricsDTO } from '../utils.ts';
import CategoricalView from './CategoricalView.tsx';
import NumericalView from './NumericalView.tsx';

interface Props {
    metrics: Record<string, MetricsDTO>;
}

/**
 * MetricView - Main entry point for rendering metrics
 *
 * Separates metrics by type and renders appropriate views:
 * - NumericalView: For numerical metrics (continuous/discrete)
 * - CategoricalView: For categorical metrics
 */
const MetricView = ({ metrics }: Props) => {
    // Separate metrics by type
    const { numericalMetrics, categoricalMetrics } = useMemo(() => {
        const numerical: Record<
            string,
            { type: 'numerical'; scores: { [repeatId: string]: number } }
        > = {};
        const categorical: Record<
            string,
            {
                type: 'category';
                scores: { [repeatId: string]: { [category: string]: number } };
            }
        > = {};

        Object.entries(metrics).forEach(([metricName, metricData]) => {
            if (metricData.type === 'numerical') {
                numerical[metricName] = metricData;
            } else if (metricData.type === 'category') {
                categorical[metricName] = metricData;
            }
        });

        return { numericalMetrics: numerical, categoricalMetrics: categorical };
    }, [metrics]);

    const hasNumerical = Object.keys(numericalMetrics).length > 0;
    const hasCategorical = Object.keys(categoricalMetrics).length > 0;

    if (!hasNumerical && !hasCategorical) {
        return null;
    }

    console.log('numericalMetrics', JSON.stringify(numericalMetrics, null, 2));
    // console.log('categoricalMetrics', JSON.stringify(categoricalMetrics, null, 2));

    return (
        <div className="space-y-4">
            {hasNumerical && <NumericalView metrics={numericalMetrics} />}
            {hasCategorical && <CategoricalView metrics={categoricalMetrics} />}
        </div>
    );
};

export default memo(MetricView);
