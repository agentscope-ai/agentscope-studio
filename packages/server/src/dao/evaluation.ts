import { EvaluationForm } from '../../../shared/src/types/evaluation';
import { BenchmarkTable } from '@/models/evaluation/benchmark';
import { EvaluationTable } from '@/models/evaluation/evaluation';
import { FindOptionsWhere, In } from 'typeorm';
import { RunTable } from '@/models/Run';


export class EvaluationDao {
    static async saveEvaluation(data: EvaluationForm) {
        // Save the benchmark data first
        // If the benchmark already exists, it will not create a new one
        const benchmarkExist = await BenchmarkTable.exists(
            { where: { name: data.benchmark.name }},
        )
        if (!benchmarkExist) {
            console.error(data);
            const benchmark = BenchmarkTable.create(
                {
                    name: data.benchmark.name,
                    description: data.benchmark.description,
                    totalTasks: data.benchmark.totalTasks,
                }
            );
            await benchmark.save();
        }
        console.error(`${data.benchmark.name}-${data.evaluationName}`);
        const newEval = EvaluationTable.create(
            {
                id: `${data.benchmark.name}-${data.evaluationName}`,
                evaluationName: data.evaluationName,
                benchmarkName: data.benchmark.name,
                createdAt: data.createdAt,
                totalRepeats: data.totalRepeats,
                schemaVersion: data.schemaVersion,
                evaluationDir: data.evaluationDir,
            }
        );
        await newEval.save();
    }

    static async getAllBenchmarks() {
        return await BenchmarkTable.find(
            {
                relations: ['evaluations'],
            }
        );
    }

    static async getEvaluationsByBenchmark(benchmarkName: string) {
        return await EvaluationTable.find({
            where: {
                benchmarkName,
            },
        });
    }

    static async deleteEvaluation(evaluationIds: string[]) {
        const conditions: FindOptionsWhere<EvaluationTable> = {
            id: In(evaluationIds),
        };
        const result = await RunTable.delete(conditions);
        return result.affected;
    }

    static async deleteBenchmark(benchmarkName: string) {
        const result = await BenchmarkTable.delete({ name: benchmarkName });
        return result.affected;
    }
}