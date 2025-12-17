export interface Benchmark {
    name: string;
    description: string;
    totalTasks: number;
    evaluations: Evaluation[];
}

export interface Evaluation {
    id: string;
    evaluationName: string;
    createdAt: string;
    totalRepeats: number;
    schemaVersion: number;
    evaluationDir: string;
}

/*
 * The RESTFul API form for creating a new evaluation
 */
export interface EvaluationForm extends Evaluation {
    benchmark: Benchmark;
}

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

export interface EvalResult {
    total_tasks: number;
    total_repeats: number;
    total_stats: EvalStats;
    repeats: {
        [repeatId: string]: EvalRepeatResult;
    };
    schema_version: number;
}
