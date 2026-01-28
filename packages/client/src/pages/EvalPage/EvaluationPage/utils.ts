import { EvalResult } from '@shared/types/evaluation.ts';

export type MetricsDTO =
    | {
          type: 'numerical';
          scores: {
              [repeatId: string]: number;
          };
      }
    | {
          type: 'category';
          scores: {
              [repeatId: string]: {
                  [category: string]: number;
              };
          };
      };

export interface MetricsRecord {
    [metricName: string]: {
        type: 'numerical';
        scores: number[];
    };
}

/**
 * The DTO (Data Transfer Object) for the evaluation overview page. Used in the
 * card view to show the summary of an evaluation.
 */
export interface EvaluationDTO {
    // Used in the card view
    progress: number;
    nCompletedTask: number;
    nIncompleteTask: number;
    nMetric: number;
    nNumericalMetric: number;
    nCategoricalMetric: number;
    nPromptTokens: number;
    nCompletionTokens: number;
    // Used in the graph analysis view
    metrics: Record<string, MetricsDTO>;
    // Used in the card view
    tool: Record<string, number>;
    llm: Record<string, number>;
}

export const convertToDTO = (data: EvalResult | undefined) => {
    if (!data) {
        return;
    }

    // Convert EvaluationResult to EvaluationDTO
    // Progress
    const progress = Math.round(
        (Object.keys(data.repeats).length / data.total_repeats) * 100,
    );

    // Metrics, used for card view
    const metrics: Record<string, MetricsDTO> = {};

    // Number of tokens
    let nPromptTokens = 0;
    let nCompletionTokens = 0;

    Object.values(data.total_stats?.chat_usage || {}).forEach((usage) => {
        nPromptTokens += usage.input_tokens;
        nCompletionTokens += usage.output_tokens;
    });

    // Completed and incomplete tasks
    let nCompletedTask = 0;
    let nIncompleteTask = 0;

    // Across different repeats
    Object.entries(data.repeats).forEach(([repeatId, repeatResult]) => {
        // The number of the completed/incomplete tasks
        nCompletedTask += repeatResult.completed_tasks;
        nIncompleteTask += repeatResult.incomplete_tasks;

        // Across different metrics
        Object.entries(repeatResult.metrics).forEach(
            ([metricName, metricRes]) => {
                if (metricRes.type === 'numerical') {
                    if (!(metricName in metrics)) {
                        metrics[metricName] = {
                            type: 'numerical',
                            scores: {},
                        };
                    }

                    // The metric bar in card view
                    const metricEntry = metrics[metricName];
                    if (metricEntry.type === 'numerical') {
                        metricEntry.scores[repeatId] =
                            metricRes.aggregation.mean;
                    }
                } else if (metricRes.type === 'category') {
                    if (!(metricName in metrics)) {
                        metrics[metricName] = {
                            type: 'category',
                            scores: {},
                        };
                    }
                    metrics[metricName].scores[repeatId] =
                        metricRes.aggregation;
                }
            },
        );
    });
    const nMetric = Object.keys(metrics).length;
    const nNumericalMetric = Object.values(metrics).filter(
        (m) => m.type === 'numerical',
    ).length;
    const nCategoricalMetric = nMetric - nNumericalMetric;

    return {
        // Card view data
        progress,
        nCompletedTask,
        nIncompleteTask,
        nMetric,
        nNumericalMetric,
        nCategoricalMetric,
        nPromptTokens,
        nCompletionTokens,

        metrics,

        llm: data.total_stats?.llm || {},
        tool: data.total_stats?.tool || {},
    } as EvaluationDTO;
};

const formatNumber = (num: number, decimals: number = 6): number => {
    return parseFloat(num.toFixed(decimals));
};

// Calculate the cumulative distribution function (CDF) from an array of numbers
export const arrayToCDF = (data: number[]) => {
    if (data.length === 0) {
        return [];
    }

    const n = data.length;
    const sortedData = [...data].sort((a, b) => a - b);
    const minX = sortedData[0];
    const maxX = sortedData[sortedData.length - 1];

    // Calculate appropriate offset based on data range
    const range = maxX - minX;
    const offset =
        range > 0
            ? range * 0.1 // 10% of the range
            : Math.abs(minX) * 0.1 || 0.1; // 10% of the value or 0.1 if value is 0

    const cdfPoints = sortedData.map((value, index) => ({
        x: formatNumber(value),
        cdf: formatNumber((index + 1) / n),
    }));

    return [
        { x: formatNumber(minX - offset), cdf: 0 },
        ...cdfPoints,
        { x: formatNumber(maxX + offset), cdf: 1 },
    ];
};
