/**
 * Types related to Evaluations
 */

// The evaluation data structure
export interface Evaluation {
    id: string;
    evaluationName: string;
    createdAt: string;
    totalRepeats: number;
    schemaVersion: number;
    evaluationDir: string;
    benchmarkName: string;
    benchmarkDescription: string;
    benchmarkTotalTasks: number;
}

// The numerical metric result
interface EvalNumericalMetricResult {
    type: 'numerical';
    involved_tasks: number;
    completed_tasks: number;
    incomplete_tasks: number;
    aggregation: {
        mean: number;
        max: number;
        min: number;
    };
    distribution: {
        [taskId: string]: number;
    };
}

// Categorical metric result
interface EvalCategoricalMetricResult {
    type: 'category';
    involved_tasks: number;
    completed_tasks: number;
    incomplete_tasks: number;
    aggregation: {
        [category: string]: number;
    };
    distribution: {
        [taskId: string]: string;
    };
}

// The evaluation statistics
interface EvalStats {
    llm: {
        [key: string]: number;
    };
    agent: number;
    tool: {
        [key: string]: number;
    };
    embedding: {
        [key: string]: number;
    };
    chat_usage: {
        [key: string]: {
            input_tokens: number;
            output_tokens: number;
        };
    };
}

// The evaluation result for a single repeat
interface EvalRepeatResult {
    completed_tasks: number;
    incomplete_tasks: number;
    metrics: {
        [metricName: string]:
            | EvalNumericalMetricResult
            | EvalCategoricalMetricResult;
    };
    completed_ids: string[];
    incomplete_ids: string[];
    stats: EvalStats;
}

// The overall evaluation result
export interface EvalResult {
    total_tasks: number;
    total_repeats: number;
    total_stats: EvalStats;
    repeats: {
        [repeatId: string]: EvalRepeatResult;
    };
    schema_version: number;
}

// The metadata for an evaluation task
export interface EvalTaskMeta {
    id: string;
    input: string;
    metrics: string[];
    tags: Record<string, string>;
}
