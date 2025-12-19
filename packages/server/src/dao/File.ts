import fs from 'fs/promises';
import { EvalTaskMeta } from '../../../shared/src/types/evaluation';
import { TableData, TableRequestParams } from '../../../shared/src';

export class FileDao {
    static async getJSONFile<T>(filePath: string): Promise<T> {
        // 从文件路径上读取对应的 JSON 文件，并解析为对象返回
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data) as T;
    }

    static async getEvaluationTasks(
        evaluationDir: string,
        params: TableRequestParams,
    ) {
        // First check if the evaluationDir exists and is a directory
        const stat = await fs.stat(evaluationDir);
        if (!stat.isDirectory()) {
            throw new Error(`${evaluationDir} is not a directory`);
        }

        // Then read the subdir in the evaluationDir, each represents a task
        const subdirs = await fs.readdir(evaluationDir);

        let tasks = [];
        for (const subdir of subdirs) {
            // Read the task_meta.json file in each subdir to get the task metadata
            const taskMetaPath = `${evaluationDir}/${subdir}/task_meta.json`;
            // Check if the task_meta.json file exists
            const metaData =
                await this.getJSONFile<Record<string, unknown>>(taskMetaPath);
            // If the metaData doesn't have id field, just skip
            if (!metaData.id) {
                continue;
            }

            const metrics: string[] = [];
            (metaData.metrics as Array<Record<string, unknown>>).forEach(
                (metric) => {
                    if (metric.name) {
                        metrics.push(metric.name as string);
                    }
                },
            );

            tasks.push({
                id: metaData.id,
                input: metaData.input || 'N/A',
                metrics: metrics,
                tags: metaData.tags || {},
            } as EvalTaskMeta);
        }

        const total = tasks.length;

        // Apply the pagination params
        // Filter
        if (params.filters && Object.keys(params.filters).length > 0) {
            const filters = params.filters;
            tasks = tasks.filter((task) => {
                let check = true;
                for (const key in filters) {
                    switch (key) {
                        case 'id':
                        case 'input':
                            // if string contains the filter value, then return true
                            if (!task[key].includes(filters[key])) {
                                check = false;
                            }
                            break;
                        case 'metrics':
                            // if metrics array contains any metric that includes the filter value, then return true
                            if (
                                !task.metrics.some((metric) =>
                                    metric.includes(filters[key]),
                                )
                            ) {
                                check = false;
                            }
                            break;
                        case 'tage':
                            // if any tag key or value contains the filter value, then return true
                            if (
                                !Object.entries(task.tags).some(
                                    ([tagKey, tagValue]) =>
                                        tagKey.includes(filters[key]) ||
                                        (typeof tagValue === 'string' &&
                                            tagValue.includes(filters[key])),
                                )
                            ) {
                                check = false;
                            }
                            break;
                    }
                }
                return check;
            });
        }

        // Sort
        if (params.sort) {
            // 按照sort.field数据域和sort.order排序，简单方式是全按照JSON.stringify来比较
            tasks.sort((a, b) => {
                const field = params.sort!.field as keyof EvalTaskMeta;
                const order = params.sort!.order;
                const aValue = JSON.stringify(a[field]);
                const bValue = JSON.stringify(b[field]);
                if (order === 'desc') {
                    return bValue.localeCompare(aValue);
                } else {
                    return aValue.localeCompare(bValue);
                }
            });
        }

        // Pagination
        const startIndex =
            (params.pagination.page - 1) * params.pagination.pageSize;
        const endIndex = startIndex + params.pagination.pageSize;
        return {
            list: tasks.slice(startIndex, endIndex),
            total: total,
            page: params.pagination.page,
            pageSize: params.pagination.pageSize,
        } as TableData<EvalTaskMeta>;
    }
}
