
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

interface NumericalResult {
    type: 'numerical';
    involved_tasks: number;
    completed_tasks: number;
    incomplete_tasks: number;
    aggregation: {
        mean: number;
        max: number;
        min: number;
    },
    distribution: {
        [taskId: string]: number;
    }
}

interface RepeatResult {
    completed_tasks: number
    incomplete_tasks: number
    metrics: {
        [metricName: string]: NumericalResult
    }
    completed_ids: string[]
    incomplete_ids: string[]
}

export interface EvaluationResult {
    total_tasks: number
    total_repeats: number
    repeats: {
        [repeatId: string]: RepeatResult
    }
    schema_version: number
}
