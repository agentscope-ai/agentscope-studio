import { EvaluationTable } from '@/models/evaluation';
import { FindOptionsWhere, In, Like } from 'typeorm';
import { Evaluation } from '../../../shared/src/types/evaluation';
import { TableRequestParams, TableData } from '../../../shared/src';

export class EvaluationDao {
    static async saveEvaluation(data: Evaluation) {
        const newEval = EvaluationTable.create({ ...data });
        await newEval.save();
    }

    static async deleteEvaluations(evaluationIds: string[]) {
        const conditions: FindOptionsWhere<EvaluationTable> = {
            id: In(evaluationIds),
        };
        const result = await EvaluationTable.delete(conditions);
        return result.affected;
    }

    static async getEvaluation(evaluationId: string) {
        return await EvaluationTable.findOne({
            where: { id: evaluationId },
            relations: ['benchmark'],
        });
    }

    static async getEvaluations(
        params: TableRequestParams,
    ): Promise<TableData<Evaluation>> {
        try {
            const { pagination, sort, filters } = params;

            // Build find options with filters
            const where: FindOptionsWhere<EvaluationTable> = {};

            if (filters) {
                if (filters.evaluationName) {
                    where.evaluationName = Like(`%${filters.evaluationName}%`);
                }
                if (filters.benchmarkName) {
                    where.benchmarkName = Like(`%${filters.benchmarkName}%`);
                }
            }

            // Apply sorting
            const sortField = sort?.field || 'createdAt';
            const sortOrder =
                sort?.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            // Map sort field to actual column names
            const orderBy: { [key: string]: 'ASC' | 'DESC' } = {};
            switch (sortField) {
                case 'evaluationName':
                case 'benchmarkName':
                case 'createdAt':
                case 'totalRepeats':
                case 'benchmarkTotalTasks':
                    orderBy[sortField] = sortOrder;
                    break;
                default:
                    orderBy.createdAt = 'DESC';
            }

            // Get total count
            const total = await EvaluationTable.count({ where });

            // Apply pagination and get results
            const skip = (pagination.page - 1) * pagination.pageSize;
            const list = await EvaluationTable.find({
                where,
                order: orderBy,
                skip,
                take: pagination.pageSize,
            });

            return {
                list,
                total,
                page: pagination.page,
                pageSize: pagination.pageSize,
            } as TableData<Evaluation>;
        } catch (error) {
            console.error('Error in getEvaluations:', error);
            throw error;
        }
    }
}
