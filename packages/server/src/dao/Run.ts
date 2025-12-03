import { FindOptionsWhere, In } from 'typeorm';
import {
    InputRequestData,
    ProjectData,
    RunData,
    Status,
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
