import { EvaluationResult } from '@shared/types/evaluation.ts';


export interface MetricsDTO {
    [metricName: string]: {
        type: 'numerical',
        scores: {
            name: string,  // RepeatID
            value: number,
        }[],
    } | {
        type: 'category',
        scores: {
            [key: string]: number
        }[]
    }
}

export interface MetricsRecord {
    [metricName: string]: {
        type: 'numerical'
        scores: number[]
    }
}

export type EvaluationTaskDTO = {
    id: string
    nRepeats: number
} & MetricsRecord

export interface EvaluationDTO {
    progress: number
    nMetrics: number
    nRepeats: number
    metrics: MetricsDTO
    dataSource: EvaluationTaskDTO[]
}


export const convertToDTO = (data: EvaluationResult) => {
    // Convert EvaluationResult to EvaluationDTO

    // Progress
    const progress = Math.round(
        Object.keys(data.repeats).length / data.total_repeats * 100
    );

    // Metrics
    const metrics: MetricsDTO = {};
    const dataSource: {
        [taskId: string]: EvaluationTaskDTO
    } = {};

    // Across different repeats
    Object.entries(data.repeats).forEach(
        ([repeatId, repeatResult]) => {
            // Across different metrics
            Object.entries(repeatResult.metrics).forEach(
                ([metricName, metricRes]) => {
                    if (metricRes.type === 'numerical') {
                        if (!(metricName in metrics)) {
                            metrics[metricName] = {
                                type: 'numerical',
                                scores: []
                            }
                        }

                        metrics[metricName].scores.push(
                            {
                                name: repeatId,
                                value: metricRes.aggregation.mean,
                            }
                        );

                        Object.entries(metricRes.distribution).forEach(
                            ([taskId, score]) => {
                                if (!(taskId in dataSource)) {
                                    dataSource[taskId] = {
                                        id: taskId,
                                        nRepeats: 0,
                                        metrics: {}
                                    };
                                }
                                if (!(metricName in dataSource[taskId].metrics)) {
                                    dataSource[taskId].metrics[metricName] = {
                                        type: 'numerical',
                                        scores: []
                                    };
                                }
                                dataSource[taskId].nRepeats += 1;
                                dataSource[taskId].metrics[metricName].scores.push(score);
                            }
                        )

                    } else if (metricRes.type === 'category') {
                        if (!(metricName in metrics)) {
                            metrics[metricName] = {
                                type: "category",
                                scores: []
                            }
                        }
                        metrics[metricName].scores.push(
                            metricRes.aggregation as Record<string, number>
                        );
                    }
                }
            )
        }
    )
    const nMetrics = Object.keys(metrics).length;

    return {
        progress: progress,
        nMetrics: nMetrics,
        metrics: metrics,
        dataSource: Object.values(dataSource),
        nRepeats: data.total_repeats
    } as EvaluationDTO;
}

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
}
