import { FindOptionsWhere, In } from 'typeorm';
import {
    InputRequestData,
    ProjectData,
    RunData,
    Status,
    TableData,
} from '../../../shared/src';
import { RunTable } from '../models/Run';
import { RunView } from '../models/RunView';
import { checkProcessByPid } from '../utils';
import { SpanDao } from './Trace';

export class RunDao {
    static async doesProjectExist(project: string) {
        try {
            const run = await RunTable.findOne({ where: { project } });
            return run !== null;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    static async doesRunExist(runId: string): Promise<boolean> {
        try {
            const run = await RunTable.findOne({ where: { id: runId } });
            return run !== null;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    static async addRun(runData: RunData) {
        try {
            const run = RunTable.create({ ...runData });
            await run.save();
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    /**
     * Retrieve paginated projects with aggregated run statistics
     *
     * This method performs an optimized database query to fetch project data with:
     * - Count of runs by status (running, pending, finished)
     * - Total number of runs per project
     * - Project creation timestamp (earliest run timestamp)
     * - Support for pagination, sorting, and filtering
     *
     * @param pagination - Object containing page and pageSize
     * @param pagination.page - Current page number (1-based)
     * @param pagination.pageSize - Number of items per page
     *
     * @param sort - Optional sorting configuration
     * @param sort.field - Field to sort by (project, running, pending, finished, total, createdAt)
     * @param sort.order - Sort direction ('asc' or 'desc')
     *
     * @param filters - Optional filters for querying
     * @param filters.project - Project name filter (uses LIKE for partial matching)
     *
     * @returns Promise resolving to TableData structure containing:
     *   - list: Array of ProjectData objects
     *   - total: Total number of projects (before pagination)
     *   - page: Current page number
     *   - pageSize: Items per page
     *
     * @throws Error if database query fails
     *
     * @example
     * const result = await RunDao.getProjects(
     *   { page: 1, pageSize: 10 },
     *   { field: 'total', order: 'desc' },
     *   { project: 'agent' }
     * );
     * // Returns: { list: [...], total: 25, page: 1, pageSize: 10 }
     */
    static async getProjects(
        pagination: {
            page: number;
            pageSize: number;
        },
        sort?: {
            field: string;
            order: 'asc' | 'desc';
        },
        filters?: {
            [key: string]: unknown;
        },
    ): Promise<TableData<ProjectData>> {
        try {
            // Build base query with aggregations using parameterized queries
            let queryBuilder = RunTable.createQueryBuilder('run')
                .select('run.project', 'project')
                .addSelect(
                    'SUM(CASE WHEN run.status = :runningStatus THEN 1 ELSE 0 END)',
                    'running',
                )
                .addSelect(
                    'SUM(CASE WHEN run.status = :pendingStatus THEN 1 ELSE 0 END)',
                    'pending',
                )
                .addSelect(
                    'SUM(CASE WHEN run.status = :doneStatus THEN 1 ELSE 0 END)',
                    'finished',
                )
                .addSelect('COUNT(*)', 'total')
                .addSelect('MIN(run.timestamp)', 'createdAt')
                .groupBy('run.project')
                .setParameters({
                    runningStatus: Status.RUNNING,
                    pendingStatus: Status.PENDING,
                    doneStatus: Status.DONE,
                });

            // Apply filters using HAVING (since we're using GROUP BY)
            if (filters?.project) {
                queryBuilder = queryBuilder.having(
                    'run.project LIKE :projectFilter',
                    {
                        projectFilter: `%${filters.project}%`,
                    },
                );
            }

            // Apply sorting
            const sortField = sort?.field || 'createdAt';
            const sortOrder = (sort?.order?.toUpperCase() || 'DESC') as
                | 'ASC'
                | 'DESC';

            switch (sortField) {
                case 'project':
                    queryBuilder.orderBy('run.project', sortOrder);
                    break;
                case 'running':
                case 'pending':
                case 'finished':
                case 'total':
                case 'createdAt':
                    queryBuilder.orderBy(sortField, sortOrder);
                    break;
                default:
                    queryBuilder.orderBy('createdAt', 'DESC');
            }

            // Clone query for count (before pagination)
            const countQuery = queryBuilder.clone();
            const totalResult = await countQuery.getRawMany();
            const total = totalResult.length;

            // Apply pagination
            const offset = (pagination.page - 1) * pagination.pageSize;
            queryBuilder.limit(pagination.pageSize).offset(offset);

            // Execute paginated query
            const result = await queryBuilder.getRawMany();

            // Map results to ProjectData type
            const list = result.map((row) => ({
                project: row.project,
                running: Number(row.running) || 0,
                pending: Number(row.pending) || 0,
                finished: Number(row.finished) || 0,
                total: Number(row.total) || 0,
                createdAt: row.createdAt,
            })) as ProjectData[];

            return {
                list,
                total,
                page: pagination.page,
                pageSize: pagination.pageSize,
            };
        } catch (error) {
            console.error('Error in getProjects:', error);
            throw error;
        }
    }

    static async getAllProjects(): Promise<ProjectData[]> {
        try {
            const result = await RunTable.createQueryBuilder('run')
                .select('DISTINCT run.project', 'project')
                .addSelect(
                    (qb) =>
                        qb
                            .select('COUNT(*)')
                            .from(RunTable, 'r')
                            .where('r.project = run.project')
                            .andWhere('r.status = :running', {
                                running: Status.RUNNING,
                            }),
                    'running',
                )
                .addSelect(
                    (qb) =>
                        qb
                            .select('COUNT(*)')
                            .from(RunTable, 'r')
                            .where('r.project = run.project')
                            .andWhere('r.status = :pending', {
                                pending: Status.PENDING,
                            }),
                    'pending',
                )
                .addSelect(
                    (qb) =>
                        qb
                            .select('COUNT(*)')
                            .from(RunTable, 'r')
                            .where('r.project = run.project')
                            .andWhere('r.status = :finished', {
                                finished: Status.DONE,
                            }),
                    'finished',
                )
                .addSelect(
                    (qb) =>
                        qb
                            .select('MIN(r.timestamp)')
                            .from(RunTable, 'r')
                            .where('r.project = run.project'),
                    'createdAt',
                )
                .groupBy('run.project')
                .getRawMany();

            return result.map(
                (row) =>
                    ({
                        project: row.project,
                        running: parseInt(row.running),
                        pending: parseInt(row.pending),
                        finished: parseInt(row.finished),
                        total:
                            parseInt(row.running) +
                            parseInt(row.pending) +
                            parseInt(row.finished),
                        createdAt: row.createdAt,
                    }) as ProjectData,
            );
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    /*
     * Get all runs for a project
     */
    static async getAllProjectRuns(project: string) {
        try {
            const result = await RunTable.find({
                where: { project },
                order: { timestamp: 'DESC' },
            });

            return result.map(
                (row) =>
                    ({
                        id: row.id,
                        project: row.project,
                        name: row.name,
                        timestamp: row.timestamp,
                        run_dir: row.run_dir,
                        pid: row.pid,
                        status: row.status,
                    }) as RunData,
            );
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    static async getRunData(runId: string) {
        try {
            const result = await RunTable.findOne({
                where: { id: runId },
                relations: ['replies', 'replies.messages', 'inputRequests'],
            });

            const spans = await SpanDao.getSpansByConversationId(runId);

            if (result) {
                return {
                    runData: {
                        id: result.id,
                        project: result.project,
                        name: result.name,
                        timestamp: result.timestamp,
                        run_dir: result.run_dir,
                        pid: result.pid,
                        status: result.status,
                    } as RunData,
                    inputRequests: result.inputRequests.map(
                        (row) =>
                            ({
                                requestId: row.requestId,
                                agentId: row.agentId,
                                agentName: row.agentName,
                                structuredInput: row.structuredInput,
                            }) as InputRequestData,
                    ),
                    replies: result.replies.map((row) => ({
                        replyId: row.replyId,
                        replyRole: row.replyRole,
                        replyName: row.replyName,
                        createdAt: row.createdAt,
                        finishedAt: row.finishedAt,
                        messages: row.messages.map((msg) => ({
                            id: msg.id,
                            name: msg.msg.name,
                            role: msg.msg.role,
                            content: msg.msg.content,
                            timestamp: msg.msg.timestamp,
                            metadata: msg.msg.metadata,
                        })),
                    })),
                    spans: spans,
                };
            } else {
                throw new Error(`Run with id ${runId} not found`);
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    static async changeRunStatus(runId: string, newStatus: Status) {
        try {
            const run = await RunTable.findOne({ where: { id: runId } });

            if (run) {
                run.status = newStatus;
                await run.save();
            } else {
                throw new Error(`Run with id ${runId} not found`);
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    static async updateRunStatusAtBeginning() {
        try {
            const runs = await RunTable.find({
                where: [{ status: Status.RUNNING }, { status: Status.PENDING }],
            });

            for (const run of runs) {
                const processExists = await checkProcessByPid(run.pid);
                if (!processExists) {
                    run.status = Status.DONE;
                    await run.save();
                }
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    static async getRunViewData() {
        // Get run view data
        const runViewData = await RunView.find();
        // Search four projects that are updated most recently
        const recentProjects = await RunTable.createQueryBuilder('run')
            .select('run.project', 'project')
            .addSelect('MAX(run.timestamp)', 'lastUpdateTime')
            .addSelect('COUNT(*)', 'runCount')
            // 按项目分组
            .groupBy('run.project')
            // 按最后更新时间降序排序
            .orderBy('lastUpdateTime', 'DESC')
            // 限制返回4个结果
            .limit(4)
            .getRawMany();

        return {
            ...runViewData[0],
            recentProjects: recentProjects.map((project) => ({
                name: project.project,
                lastUpdateTime: project.lastUpdateTime,
                runCount: parseInt(project.runCount),
            })),
        };
    }

    static async deleteRuns(runIds: string[]) {
        try {
            if (runIds.length > 0) {
                await SpanDao.deleteSpansByConversationIds(runIds);
            }
            const conditions: FindOptionsWhere<RunTable> = {
                id: In(runIds),
            };
            const result = await RunTable.delete(conditions);
            return result.affected;
        } catch (error) {
            console.error('Error deleting runs:', error);
            throw error;
        }
    }

    static async deleteProjects(projects: string[]) {
        try {
            const runsToDelete = await RunTable.find({
                where: { project: In(projects) },
                select: ['id'],
            });
            const runIds = runsToDelete.map((run) => run.id);

            if (runIds.length > 0) {
                await SpanDao.deleteSpansByConversationIds(runIds);
            }

            const conditions: FindOptionsWhere<RunTable> = {
                project: In(projects),
            };
            const result = await RunTable.delete(conditions);
            return result.affected;
        } catch (error) {
            console.error('Error deleting projects:', error);
            throw error;
        }
    }
}
