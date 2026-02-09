import fs from 'fs/promises';
import path from 'path';
import {
    ArrayElementContainsFilterOperator,
    ArrayFilterOperator,
    StringFilterOperator,
    TableData,
    TableRequestParams,
} from '../../../shared/src';
import {
    EvalMetricResult,
    EvalStats,
    EvalTask,
    EvalTaskMeta,
} from '../../../shared/src/types/evaluation';

export class FileDao {
    static async getJSONFile<T>(filePath: string): Promise<T> {
        // Read the file content
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

        // Then read the dir in the evaluationDir, each represents a task
        const subDirs = await fs.readdir(evaluationDir);

        let tasks = [];
        for (const subDir of subDirs) {
            // First check if the dir is a directory
            const subDirStat = await fs.stat(path.join(evaluationDir, subDir));
            if (subDirStat.isDirectory()) {
                // Read the task_meta.json file in each directory to get the task metadata
                const taskMetaPath = path.join(
                    evaluationDir,
                    subDir,
                    'task_meta.json',
                );
                // Check if the task_meta.json file exists
                const metaData =
                    await this.getJSONFile<Record<string, unknown>>(
                        taskMetaPath,
                    );

                // If the metaData doesn't have id field, just skip
                if (!metaData.id) {
                    continue;
                }

                // The metric fields
                const metrics: string[] = [];
                (metaData.metrics as Array<Record<string, unknown>>).forEach(
                    (metric) => {
                        if (metric.name) {
                            metrics.push(metric.name as string);
                        }
                    },
                );

                // The tags fields
                const tags: string[] = Object.entries(metaData.tags || {}).map(
                    ([tagKey, tagValue]) => `${tagKey}:${tagValue}`,
                );

                // Push to tasks
                tasks.push({
                    id: metaData.id,
                    input: metaData.input || 'N/A',
                    metrics: metrics,
                    tags: tags,
                } as EvalTaskMeta);
            }
        }

        // Apply the pagination params
        // Filter
        if (params.filters && Object.keys(params.filters).length > 0) {
            const filters = params.filters;
            tasks = tasks.filter((task) => {
                let reserve = true;
                for (const key in filters) {
                    const filterOps = filters[key];
                    switch (key) {
                        case 'id':
                            switch (filterOps.operator) {
                                case StringFilterOperator.CONTAINS:
                                    if (!task.id.includes(filterOps.value)) {
                                        reserve = false;
                                    }
                                    break;
                                case StringFilterOperator.NOT_CONTAINS:
                                    if (task.id.includes(filterOps.value)) {
                                        reserve = false;
                                    }
                                    break;
                                default:
                                    console.log(
                                        `Unsupported filter operator for Task id field: ${filterOps.operator}`,
                                    );
                            }
                            break;

                        case 'input':
                            switch (filterOps.operator) {
                                case StringFilterOperator.CONTAINS:
                                    if (!task.input.includes(filterOps.value)) {
                                        reserve = false;
                                    }
                                    break;
                                case StringFilterOperator.NOT_CONTAINS:
                                    if (task.input.includes(filterOps.value)) {
                                        reserve = false;
                                    }
                                    break;
                                default:
                                    console.log(
                                        `Unsupported filter operator for Task input field: ${filterOps.operator}`,
                                    );
                            }
                            break;

                        case 'metrics':
                            // if metrics array contains any metric that includes the filter value, then return true
                            switch (filterOps.operator) {
                                case ArrayFilterOperator.IN:
                                    if (
                                        !task.metrics.includes(
                                            String(filterOps.value),
                                        )
                                    ) {
                                        reserve = false;
                                    }
                                    break;
                                case ArrayFilterOperator.NOT_IN:
                                    if (
                                        task.metrics.includes(
                                            String(filterOps.value),
                                        )
                                    ) {
                                        reserve = false;
                                    }
                                    break;
                                default:
                                    console.log(
                                        `Unsupported filter operator for Task metrics field: ${filterOps.operator}`,
                                    );
                            }
                            break;

                        case 'tags':
                            switch (filterOps.operator) {
                                case ArrayFilterOperator.IN:
                                    // if none of the tags match, then filter out
                                    if (
                                        !task.tags.some((tag) =>
                                            filterOps.value.includes(tag),
                                        )
                                    ) {
                                        reserve = false;
                                    }
                                    break;

                                case ArrayFilterOperator.NOT_IN:
                                    if (
                                        task.tags.some((tag) =>
                                            filterOps.value.includes(tag),
                                        )
                                    ) {
                                        reserve = false;
                                    }
                                    break;

                                case ArrayElementContainsFilterOperator.ARRAY_ELEMENT_CONTAINS:
                                    if (
                                        !task.tags.some((tag) =>
                                            tag.includes(filterOps.value),
                                        )
                                    ) {
                                        reserve = false;
                                    }
                                    break;

                                case ArrayElementContainsFilterOperator.ARRAY_ELEMENT_NOT_CONTAINS:
                                    if (
                                        task.tags.some((tag) =>
                                            tag.includes(filterOps.value),
                                        )
                                    ) {
                                        reserve = false;
                                    }
                                    break;

                                default:
                                    console.log(
                                        `Unsupported filter operator for Task tag field: ${filterOps.operator}`,
                                    );
                            }
                    }
                }
                return reserve;
            });
        }

        // Sort
        if (params.sort) {
            // Sort by sort.field and sort.order using JSON.stringify for comparison
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

        console.log('Length: ', tasks.length);

        return {
            list: tasks.slice(startIndex, endIndex),
            total: tasks.length,
            page: params.pagination.page,
            pageSize: params.pagination.pageSize,
        } as TableData<EvalTaskMeta>;
    }

    static async getAllEvaluationTags(evaluationDir: string) {
        // Get all tags and their counts from task_meta files
        const stat = await fs.stat(evaluationDir);
        if (!stat.isDirectory()) {
            throw new Error(`${evaluationDir} is not a directory`);
        }

        const tagSet: Record<string, { tag: string; cnt: number }> = {};

        const subDirs = await fs.readdir(evaluationDir);
        for (const subDir of subDirs) {
            // First check if the subdir is a directory
            const subDirStat = await fs.stat(`${evaluationDir}/${subDir}`);
            if (!subDirStat.isDirectory()) {
                continue;
            }
            // Read the task_meta.json file in each subdir to get the task metadata
            const taskMetaPath = path.join(
                evaluationDir,
                subDir,
                'task_meta.json',
            );
            const metaData = (await this.getJSONFile<Record<string, unknown>>(
                taskMetaPath,
            )) as EvalTask['meta'];

            if (metaData.tags && typeof metaData.tags === 'object') {
                Object.entries(metaData.tags).forEach(([tagKey, tagValue]) => {
                    const tagStr = `${tagKey}:${tagValue}`;
                    if (tagSet[tagStr]) {
                        tagSet[tagStr].cnt += 1;
                    } else {
                        tagSet[tagStr] = {
                            tag: `${tagKey}:${tagValue}`,
                            cnt: 1,
                        };
                    }
                });
            }
        }
        return Object.values(tagSet);
    }

    static async getEvaluationTask(evaluationDir: string, taskId: string) {
        const evaluationTaskDir = path.join(evaluationDir, taskId);

        // First check if the evaluationTaskDir exists and is a directory
        const stat = await fs.stat(evaluationTaskDir);
        if (!stat.isDirectory()) {
            throw new Error(`${evaluationTaskDir} is not a directory`);
        }

        // Read the task_meta.json file in the evaluationTaskDir to get the task metadata
        const taskMetaPath = path.join(evaluationTaskDir, 'task_meta.json');
        const metaData = (await this.getJSONFile<Record<string, unknown>>(
            taskMetaPath,
        )) as EvalTask['meta'];
        // If the metaData doesn't have id field, just throw error
        if (!metaData.id) {
            throw new Error(
                `Invalid evaluation task metadata in ${taskMetaPath}`,
            );
        }

        // Read from different repeats

        // Iterate through all subdirectories in evaluationTaskDir, each represents a repeat
        const repeats: EvalTask['repeats'] = {};
        const subdirs = await fs.readdir(evaluationTaskDir);
        for (const repeatDir of subdirs) {
            // First check if the subdir is a directory
            const repeatPath = path.join(evaluationTaskDir, repeatDir);
            const repeatPathStat = await fs.stat(repeatPath);
            if (!repeatPathStat.isDirectory()) {
                continue;
            }
            repeats[repeatDir] = {};

            // Read stats.json, solution.json if exists
            const statsPath = path.join(repeatPath, 'stats.json');
            const statsPathStat = await fs.stat(statsPath);
            if (statsPathStat.isFile()) {
                repeats[repeatDir].stats =
                    await this.getJSONFile<EvalStats>(statsPath);
            }

            // solution.json is optional
            const solutionPath = path.join(repeatPath, 'solution.json');
            const solutionPathStat = await fs.stat(solutionPath);
            if (solutionPathStat.isFile()) {
                repeats[repeatDir].solution =
                    await this.getJSONFile<
                        EvalTask['repeats'][string]['solution']
                    >(solutionPath);
            }

            // read the metrics results if exists
            const metricsDirPath = path.join(repeatPath, 'evaluation');
            const metricsDirStat = await fs.stat(metricsDirPath);
            if (metricsDirStat.isDirectory()) {
                // Read all json files in the metricsDirPath, each represents a metric result
                const metricFiles = await fs.readdir(metricsDirPath);

                for (const metricFile of metricFiles) {
                    if (metricFile.endsWith('.json')) {
                        const metricFilePath = path.join(
                            metricsDirPath,
                            metricFile,
                        );
                        const metricData =
                            await this.getJSONFile<Record<string, unknown>>(
                                metricFilePath,
                            );

                        if (metricData.name && metricData.result !== null) {
                            repeats[repeatDir].result =
                                repeats[repeatDir].result || {};
                            repeats[repeatDir].result[
                                metricData.name as string
                            ] = metricData as unknown as EvalMetricResult;
                        }
                    }
                }
            }
        }

        return {
            meta: metaData,
            repeats: repeats,
        } as EvalTask;
    }
}
