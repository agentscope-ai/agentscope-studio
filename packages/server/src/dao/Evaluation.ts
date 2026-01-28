import { EvaluationTable } from '@/models/evaluation';
import { FindOptionsWhere, In, Like } from 'typeorm';
import { TableData, TableRequestParams } from '../../../shared/src';
import { Evaluation } from '../../../shared/src/types/evaluation';
import fs from 'fs';
import { ConfigManager, PATHS } from '../../../shared/src/config';

export class EvaluationDao {

    static async saveEvaluation(data: Evaluation) {
        const newEval = EvaluationTable.create({ ...data });
        await newEval.save();
    }

    static async deleteEvaluations(evaluationIds: string[]) {
        try {
            const evaluations = await EvaluationTable.find({
                where: { id: In(evaluationIds) },
            });

            const conditions: FindOptionsWhere<EvaluationTable> = {
                id: In(evaluationIds),
            };
            const result = await EvaluationTable.delete(conditions);

            const configManager = ConfigManager.getInstance();
            const safeEvalDataDir = configManager.getEvaluationDataDir();

            for (const evaluation of evaluations) {
                try {
                    const evalDir = evaluation.evaluationDir;

                    if (evalDir && evalDir.startsWith(safeEvalDataDir)) {
                        if (fs.existsSync(evalDir)) {
                            fs.rmSync(evalDir, { recursive: true, force: true });
                            console.debug(`Deleted evaluation directory: ${evalDir}`);
                        } else {
                            console.warn(`Evaluation directory not found: ${evalDir}`);
                        }
                    } else {
                        console.debug(
                            `Skipping directory deletion (outside safe zone): ${evalDir}`,
                        );
                    }
                } catch (dirError) {
                    console.error(
                        `Failed to delete directory for evaluation ${evaluation.id}:`,
                        dirError,
                    );
                }
            }

            return result.affected;
        } catch (error) {
            console.error('Error in deleteEvaluations:', error);
            throw error;
        }
    }

    static async getEvaluation(evaluationId: string) {
        return await EvaluationTable.findOne({
            where: { id: evaluationId },
        });
    }

    static async getEvaluations(
        params: TableRequestParams,
    ): Promise<TableData<Evaluation>> {
        try {
            const { pagination, sort, filters } = params;

            // Helper to extract filter value from structured format or plain string
            const getFilterValue = (filter: unknown): string | undefined => {
                if (!filter) return undefined;
                if (
                    typeof filter === 'object' &&
                    filter !== null &&
                    'value' in filter
                ) {
                    return (filter as { value: string }).value;
                }
                if (typeof filter === 'string') {
                    return filter;
                }
                return undefined;
            };

            // Build find options with filters
            const where: FindOptionsWhere<EvaluationTable> = {};

            if (filters) {
                const evaluationNameValue = getFilterValue(
                    filters.evaluationName,
                );
                if (evaluationNameValue) {
                    where.evaluationName = Like(`%${evaluationNameValue}%`);
                }

                const benchmarkNameValue = getFilterValue(
                    filters.benchmarkName,
                );
                if (benchmarkNameValue) {
                    where.benchmarkName = Like(`%${benchmarkNameValue}%`);
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
