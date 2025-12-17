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

export type EvaluationTaskDTO = {
    id: string;
    status: 'incomplete' | 'completed';
    nFinished: number;
} & MetricsRecord;

/**
 * The DTO (Data Transfer Object) for the evaluation overview page. Used in the
 * card view to show the summary of an evaluation.
 */
export interface EvaluationDTO {
    // Used in the card view
    progress: number;
    nTask: number;
    nCompletedTask: number;
    nIncompleteTask: number;
    nRepeat: number;
    nMetric: number;
    nNumericalMetric: number;
    nCategoricalMetric: number;
    nPromptTokens: number;
    nCompletionTokens: number;
    // Used in the graph analysis view
    metrics: Record<string, MetricsDTO>;
    dataSource: EvaluationTaskDTO[];
    // Used in the card view
    tool: Record<string, number>;
    llm: Record<string, number>;
}

export const convertToDTO = (data: EvalResult) => {
    // Convert EvaluationResult to EvaluationDTO

    // Progress
    const progress = Math.round(
        (Object.keys(data.repeats).length / data.total_repeats) * 100,
    );

    // Total number of tasks
    const nTask = data.total_tasks;

    // Total repeats
    const nRepeat = data.total_repeats;

    // Metrics, used for card view
    const metrics: Record<string, MetricsDTO> = {};

    // Number of tokens
    let nPromptTokens = 0;
    let nCompletionTokens = 0;
    Object.values(data.total_stats.chat_usage).forEach((usage) => {
        nPromptTokens += usage.input_tokens;
        nCompletionTokens += usage.output_tokens;
    });

    // Table data source
    const dataSource: {
        [taskId: string]: EvaluationTaskDTO;
    } = {};

    // Completed and incomplete tasks
    let nCompletedTask = 0;
    let nIncompleteTask = 0;

    // Across different repeats
    Object.entries(data.repeats).forEach(([repeatId, repeatResult]) => {
        // The number of the completed/incomplete tasks
        nCompletedTask += repeatResult.completed_tasks;
        nIncompleteTask += repeatResult.incomplete_tasks;

        // TODO: we need to use a single request here
        repeatResult.completed_ids.forEach((id) => {
            if (!(id in dataSource)) {
                dataSource[id] = {
                    id,
                    status: nRepeat === 1 ? 'completed' : 'incomplete',
                    nFinished: 1,
                } as EvaluationTaskDTO;
            } else {
                dataSource[id].nFinished += 1;
                dataSource[id].status =
                    nRepeat === dataSource[id].nFinished
                        ? 'completed'
                        : 'incomplete';
            }
        });

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
        nTask,
        nCompletedTask,
        nIncompleteTask,
        nMetric,
        nNumericalMetric,
        nCategoricalMetric,
        nRepeat,
        nPromptTokens,
        nCompletionTokens,

        metrics,
        dataSource: Object.values(dataSource),

        llm: data.total_stats.llm,
        tool: data.total_stats.tool,
    } as EvaluationDTO;
};

// 一个函数，从一个number的Array，代表取样点，转换成PDF
// 采用的算法是bootstrap
export const arrayToPDF = (data: number[]) => {
    if (data.length === 0) {
        return [];
    }

    const n = data.length;
    const sortedData = [...data].sort((a, b) => a - b);
    const pdf = sortedData.map((value, index) => ({
        x: value,
        y: (index + 1) / n,
    }));
    return pdf;
};
