import { initTRPC, TRPCError } from '@trpc/server';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import {
    BlockType,
    ContentBlocks,
    DeleteEvaluationsParamsSchema,
    GetEvaluationResultParamsSchema,
    GetEvaluationTasksParamsSchema,
    GetTraceParamsSchema,
    GetTraceStatisticParamsSchema,
    InputRequestData,
    MessageForm,
    ProjectData,
    RegisterReplyParams,
    RegisterReplyParamsSchema,
    ResponseBody,
    RunData,
    Status,
    TableData,
    TableRequestParams,
    TableRequestParamsSchema,
    Trace,
} from '../../../shared/src';
import { EvalResult, Evaluation } from '../../../shared/src/types/evaluation';
import { FileDao } from '@/dao/File';
import { EvaluationDao } from '@/dao/Evaluation';
import { verifyMetadataByVersion } from '@/trpc/utils-evaluation';
import { FridayConfigManager } from '../../../shared/src/config/friday';
import { FridayAppMessageDao } from '../dao/FridayAppMessage';
import { InputRequestDao } from '../dao/InputRequest';
import { MessageDao } from '../dao/Message';
import { ReplyDao } from '../dao/Reply';
import { RunDao } from '../dao/Run';
import { SpanDao } from '../dao/Trace';
import { SocketManager } from './socket';
import { APP_INFO } from '../../../shared/src';
import { ConfigManager } from '../../../shared/src/config/server';

const textBlock = z.object({
    text: z.string(),
    type: z.literal(BlockType.TEXT),
});

const thinkingBlock = z.object({
    thinking: z.string(),
    type: z.literal(BlockType.THINKING),
});

const base64Source = z.object({
    type: z.literal('base64'),
    media_type: z.string(),
    data: z.string(),
});

const urlSource = z.object({
    type: z.literal('url'),
    url: z.string(),
});

const imageBlock = z.object({
    type: z.literal(BlockType.IMAGE),
    source: z.union([base64Source, urlSource]),
});

const audioBlock = z.object({
    type: z.literal(BlockType.AUDIO),
    source: z.union([base64Source, urlSource]),
});

const videoBlock = z.object({
    type: z.literal(BlockType.VIDEO),
    source: z.union([base64Source, urlSource]),
});

const toolUseBlock = z.object({
    type: z.literal(BlockType.TOOL_USE),
    id: z.string(),
    name: z.string(),
    input: z.record(z.unknown()),
});

const toolResultBlock = z.object({
    type: z.literal(BlockType.TOOL_RESULT),
    id: z.string(),
    name: z.string(),
    output: z.union([
        z.string(),
        z.array(z.union([textBlock, imageBlock, audioBlock])),
    ]),
});

// Define ContentBlock as a union of all possible block types
const contentBlock = z.union([
    textBlock,
    thinkingBlock,
    imageBlock,
    audioBlock,
    videoBlock,
    toolUseBlock,
    toolResultBlock,
]);

// Define ContentBlocks as an array of ContentBlock
const contentBlocks = z.array(contentBlock);

// Define ContentType as a string or ContentBlocks
const contentType = z.union([z.string(), contentBlocks]);

const t = initTRPC.create();

export const appRouter = t.router({
    registerRun: t.procedure
        .input(
            z.object({
                id: z.string(),
                project: z.string(),
                name: z.string(),
                timestamp: z.string(),
                pid: z.number(),
                status: z.enum(Object.values(Status) as [string, ...string[]]),
                // Deprecated
                run_dir: z.string().optional().nullable(),
            }),
        )
        .mutation(async ({ input }) => {
            const runData = {
                id: input.id,
                project: input.project,
                name: input.name,
                timestamp: input.timestamp,
                run_dir: input.run_dir || '', // Deprecated
                pid: input.pid,
                status: input.status,
            } as RunData;

            await RunDao.addRun(runData);

            // Notify the subscribers of the specific project
            SocketManager.broadcastRunToProjectRoom(input.project);

            // Notify the clients of the project list
            SocketManager.broadcastRunToProjectListRoom();

            // Notify the clients of the overview room
            SocketManager.broadcastOverviewDataToDashboardRoom();
        }),

    requestUserInput: t.procedure
        .input(
            z.object({
                requestId: z.string(),
                runId: z.string(),
                agentId: z.string(),
                agentName: z.string(),
                structuredInput: z.record(z.unknown()).nullable(),
            }),
        )
        .mutation(async ({ input }) => {
            const runExist = await RunDao.doesRunExist(input.runId);

            if (!runExist) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Run with id ${input.runId} does not exist`,
                });
            }

            try {
                // Save the input request to the database
                await InputRequestDao.saveInputRequest({
                    requestId: input.requestId,
                    runId: input.runId,
                    agentId: input.agentId,
                    agentName: input.agentName,
                    structuredInput: input.structuredInput,
                });
                console.debug(
                    `${input.runId}: input request saved with id ${input.requestId}`,
                );

                // Broadcast the input request to the run room
                SocketManager.broadcastInputRequestToRunRoom(input.runId, {
                    requestId: input.requestId,
                    agentId: input.agentId,
                    agentName: input.agentName,
                    structuredInput: input.structuredInput,
                } as InputRequestData);
            } catch (error) {
                console.error(error);
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message:
                        'Failed to save input request, look at the server logs for more information',
                });
            }
        }),

    registerReply: t.procedure
        .input(RegisterReplyParamsSchema)
        .mutation(async ({ input }) => {
            try {
                await ReplyDao.saveReply(input);
            } catch (error) {
                console.error(error);
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Failed to register reply for error: ${error}`,
                });
            }
        }),

    pushMessage: t.procedure
        .input(
            z.object({
                runId: z.string(),
                replyId: z.string().optional().nullable(),
                replyName: z.string().optional().nullable(),
                replyRole: z.string().optional().nullable(),
                msg: z.object({
                    id: z.string(),
                    name: z.string(),
                    role: z.string(),
                    content: contentType,
                    metadata: z.unknown(),
                    timestamp: z.string(),
                }),
                // The name and role here are deprecated, use replyName and replyRole instead
                name: z.string().optional().nullable(),
                role: z.string().optional().nullable(),
            }),
        )
        .mutation(async ({ input }) => {
            const runExist = await RunDao.doesRunExist(input.runId);
            console.log('Received pushMessage:', input);
            if (!runExist) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Run with id ${input.runId} does not exist`,
                });
            }

            // Let's determine the replyId to use for this message
            const replyId = input.replyId ?? input.msg.id;

            // Check if the replyId exists
            if (!(await ReplyDao.doesReplyExist(replyId))) {
                // Create a reply record if it does not exist
                await ReplyDao.saveReply({
                    runId: input.runId,
                    replyId: replyId,
                    replyRole: input.replyRole ?? input.role,
                    replyName: input.replyName ?? input.name,
                    createdAt: input.msg.timestamp,
                } as RegisterReplyParams);
            }

            // Save the message to the database
            const msgFormData = {
                id: input.msg.id,
                runId: input.runId,
                replyId: replyId,
                msg: {
                    name: input.msg.name,
                    role: input.msg.role,
                    content: input.msg.content,
                    metadata: input.msg.metadata,
                    timestamp: input.msg.timestamp,
                },
            } as MessageForm;

            // Save the message
            await MessageDao.saveMessage(msgFormData);
            console.debug(`RUN-${input.runId}: message saved`);

            // Obtain the reply and broadcast to the frontend
            ReplyDao.getReply(replyId)
                .then((reply) => {
                    // Broadcast the message to the run room
                    console.debug(
                        `Broadcasting message to room run-${input.runId}`,
                    );
                    if (reply) {
                        SocketManager.broadcastMessageToRunRoom(
                            input.runId,
                            reply,
                        );
                    } else {
                        console.error(
                            `Reply with id ${replyId} not found for broadcasting`,
                        );
                    }
                })
                .catch((error) => {
                    console.error(error);
                    throw error;
                });
        }),

    pushMessageToFridayApp: t.procedure
        .input(
            z.object({
                replyId: z.string(),
                msg: z.object({
                    id: z.string(),
                    name: z.string(),
                    role: z.string(),
                    content: contentBlocks,
                    metadata: z.unknown(),
                    timestamp: z.string(),
                }),
            }),
        )
        .mutation(async ({ input }) => {
            try {
                const reply = await FridayAppMessageDao.saveReplyMessage(
                    input.replyId,
                    input.msg as {
                        id: string;
                        name: string;
                        role: string;
                        content: ContentBlocks;
                        metadata: object;
                        timestamp: string;
                    },
                    false,
                );
                // Broadcast to all the clients in the FridayAppRoom
                SocketManager.broadcastReplyToFridayAppRoom(reply);
            } catch (error) {
                console.error(error);
                throw error;
            }
        }),

    pushFinishedSignalToFridayApp: t.procedure
        .input(
            z.object({
                replyId: z.string(),
            }),
        )
        .mutation(async ({ input }) => {
            FridayAppMessageDao.finishReply(input.replyId)
                .then((reply) => {
                    // Broadcast to all the clients in the FridayAppRoom
                    SocketManager.broadcastReplyToFridayAppRoom(reply);
                })
                .catch((error) => {
                    console.error(error);
                    throw error;
                });
        }),

    clientGetFridayConfig: t.procedure.query(async () => {
        return FridayConfigManager.getInstance().getConfig();
    }),

    /**
     * Get paginated projects with optional sorting and filtering
     *
     * @param pagination - Pagination parameters (page number and page size)
     * @param sort - Optional sorting configuration (field name and order)
     * @param filters - Optional filters for project search (e.g., project name)
     * @returns ResponseBody containing TableData with project list and metadata
     *
     * @example
     * Input: {
     *   pagination: { page: 1, pageSize: 10 },
     *   sort: { field: 'createdAt', order: 'desc' },
     *   filters: { project: 'my-project' }
     * }
     *
     * Output: {
     *   success: true,
     *   message: 'Projects fetched successfully',
     *   data: {
     *     list: [...],
     *     total: 100,
     *     page: 1,
     *     pageSize: 10
     *   }
     * }
     */
    getProjects: t.procedure
        .input(TableRequestParamsSchema)
        .query(async ({ input }) => {
            try {
                console.debug('[TRPC] getProjects called with input:', input);
                const result = await RunDao.getProjects(input);
                return {
                    success: true,
                    message: 'Projects fetched successfully',
                    data: result,
                } as ResponseBody<TableData<ProjectData>>;
            } catch (error) {
                console.error('Error in getProjects:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Failed to get projects',
                });
            }
        }),

    getTraces: t.procedure
        .input(TableRequestParamsSchema)
        .query(async ({ input }) => {
            try {
                console.debug('[TRPC] getTraces called with input:', input);
                const result = await SpanDao.getTraces(input);
                return {
                    success: true,
                    message: 'Traces fetched successfully',
                    data: result,
                } as ResponseBody<TableData<Trace>>;
            } catch (error) {
                console.error('Error in getTraces:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Failed to get trace list',
                });
            }
        }),

    getTrace: t.procedure
        .input(GetTraceParamsSchema)
        .query(async ({ input }) => {
            try {
                return await SpanDao.getTrace(input.traceId);
            } catch (error) {
                console.error('Error in getTrace:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Failed to get trace',
                });
            }
        }),

    getTraceStatistic: t.procedure
        .input(GetTraceStatisticParamsSchema)
        .query(async ({ input }) => {
            try {
                return await SpanDao.getTraceStatistic(input);
            } catch (error) {
                console.error('Error in getTraceStatistic:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Failed to get trace statistics',
                });
            }
        }),

    getCurrentVersion: t.procedure.query(async () => {
        try {
            const version = APP_INFO.version;
            return {
                success: true,
                message: 'Version retrieved successfully',
                data: {
                    version: version,
                },
            } as ResponseBody<{ version: string }>;
        } catch (error) {
            console.error('Error get current version:', error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to get current version',
            });
        }
    }),

    getDataInfo: t.procedure.query(async () => {
        try {
            const configManager = ConfigManager.getInstance();
            const dbStats = configManager.getDataStats();
            return {
                success: true,
                message: 'Database info retrieved successfully',
                data: {
                    path: dbStats.path,
                    size: dbStats.size,
                    formattedSize: dbStats.formattedSize,
                    fridayConfigPath: dbStats.fridayConfigPath,
                    fridayHistoryPath: dbStats.fridayHistoryPath,
                    evaluationDataPath: dbStats.evaluationDataPath,
                },
            } as ResponseBody<{
                path: string;
                size: number;
                formattedSize: string;
                fridayConfigPath: string;
                fridayHistoryPath: string;
                evaluationDataPath: string;
            }>;
        } catch (error) {
            console.error('Error get database info:', error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to get database info',
            });
        }
    }),

    /**
     * Upload evaluation folder - accept files and reconstruct directory structure
     * Files are stored in a secure directory managed by ConfigManager
     * If evaluation with same ID exists, it will be replaced and old directory cleaned up
     */
    uploadEvaluation: t.procedure
        .input(
            z.object({
                files: z.array(
                    z.object({
                        relativePath: z.string(),
                        content: z.string(), // base64 encoded content
                    }),
                ),
            }),
        )
        .mutation(async ({ input }) => {
            let tempDir: string | null = null;

            try {
                // Get secure evaluation data directory from ConfigManager
                const configManager = ConfigManager.getInstance();
                const evaluationBaseDir = configManager.getEvaluationDataDir();

                // Create a unique directory for this evaluation using timestamp
                const timestamp = Date.now();
                tempDir = path.join(
                    evaluationBaseDir,
                    `eval_${timestamp}`,
                );
                fs.mkdirSync(tempDir, { recursive: true });

                // Write all uploaded files to the temp directory
                for (const file of input.files) {
                    const filePath = path.join(tempDir, file.relativePath);
                    const fileDir = path.dirname(filePath);

                    // Create directory structure if not exists
                    if (!fs.existsSync(fileDir)) {
                        fs.mkdirSync(fileDir, { recursive: true });
                    }

                    // Decode base64 content and write to file
                    const content = Buffer.from(file.content, 'base64');
                    fs.writeFileSync(filePath, content);
                }

                // Check if evaluation_meta.json exists
                const metaFile = path.join(tempDir, 'evaluation_meta.json');
                if (!fs.existsSync(metaFile)) {
                    // Clean up temp directory
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    return {
                        success: false,
                        message: 'evaluation_meta.json file not found in uploaded folder',
                    };
                }

                // Read and parse the meta.json file
                const metaData = JSON.parse(
                    fs.readFileSync(metaFile, 'utf-8'),
                );

                if (typeof metaData !== 'object') {
                    // Clean up temp directory
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    return {
                        success: false,
                        message: 'evaluation_meta is not a valid json object',
                    };
                }

                // verify the metadata by version
                verifyMetadataByVersion(metaData);

                // Convert metadata from snake_case to camelCase and add evaluationDir field
                await EvaluationDao.saveEvaluation({
                    id: `${metaData.benchmark.name}-${metaData.created_at}`,
                    evaluationName: metaData.evaluation_name,
                    createdAt: metaData.created_at,
                    totalRepeats: metaData.total_repeats,
                    schemaVersion: metaData.schema_version,
                    evaluationDir: tempDir,
                    benchmarkName: metaData.benchmark.name,
                    benchmarkDescription: metaData.benchmark.description,
                    benchmarkTotalTasks: metaData.benchmark.total_tasks,
                } as Evaluation);

                return {
                    success: true,
                    message: 'Upload and import evaluation successfully!',
                    data: metaData,
                };
            } catch (error) {
                // Clean up the directory we created if something went wrong
                if (tempDir && fs.existsSync(tempDir)) {
                    try {
                        fs.rmSync(tempDir, { recursive: true, force: true });
                        console.debug(`Cleaned up failed upload directory: ${tempDir}`);
                    } catch (cleanupError) {
                        console.error(`Failed to cleanup directory ${tempDir}:`, cleanupError);
                    }
                }

                console.error(error);
                return { success: false, message: `Error: ${error}` };
            }
        }),

    /**
     * List the files and directories in a given path, this interface is for
     * frontend file explorer to import evaluation from local disk.
     *
     * NOTE: This interface should be protected to only allow requests from
     * localhost for security reasons.
     *
     * @deprecated This method is deprecated. Use uploadEvaluation instead
     * for better security and user experience.
     *
     * TODO: implement the security check
     */
    listDir: t.procedure
        .input(z.object({ path: z.string() }))
        .mutation(async ({ input }) => {
            // TODO: check if the request is from localhost

            try {
                if (fs.existsSync(input.path)) {
                    const fileNames = fs
                        .readdirSync(input.path)
                        .map((fileName) => {
                            const filePath = path.join(input.path, fileName);
                            const stats = fs.statSync(filePath);
                            return {
                                name: fileName,
                                path: filePath,
                                isDirectory: stats.isDirectory(),
                            };
                        });
                    console.debug('success: ', fileNames);
                    return {
                        success: true,
                        message: 'Directory listed successfully',
                        data: fileNames,
                    };
                }
                console.error('Directory not exists: ', input.path);
                return { success: false, message: 'Directory not exists' };
            } catch (error) {
                console.error(error);
                return { success: false, message: `Error: ${error}` };
            }
        }),

    /**
     * Get the evaluation data by reading the corresponding file from
     * the evaluation directory.
     */
    getEvaluationData: t.procedure
        .input(GetEvaluationResultParamsSchema)
        .query(async ({ input }) => {
            try {
                const evaluation = await EvaluationDao.getEvaluation(
                    input.evaluationId,
                );

                if (!evaluation) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: `Evaluation with id ${input.evaluationId} does not exist`,
                    });
                }

                const result = await FileDao.getJSONFile<EvalResult>(
                    path.join(
                        evaluation.evaluationDir,
                        'evaluation_result.json',
                    ),
                );

                return {
                    success: true,
                    message: 'Get evaluation result successfully',
                    data: {
                        evaluation: evaluation,
                        result: result,
                    },
                } as ResponseBody<{
                    evaluation: Evaluation;
                    result: EvalResult;
                }>;
            } catch (error) {
                console.error(error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to get evaluation result: ${error}`,
                });
            }
        }),

    /**
     * Get paginated evaluations with optional sorting and filtering
     */
    getEvaluations: t.procedure
        .input(TableRequestParamsSchema)
        .query(async ({ input }) => {
            try {
                console.log('getEvaluations input: ', input);
                const result = await EvaluationDao.getEvaluations(input);
                return {
                    success: true,
                    message: 'Evaluations fetched successfully',
                    data: result,
                } as ResponseBody<TableData<Evaluation>>;
            } catch (error) {
                console.error('Error fetching evaluations:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to register reply for error: ${error}`,
                });
            }
        }),

    /**
     * Delete evaluations by their evaluation IDs
     */
    deleteEvaluations: t.procedure
        .input(DeleteEvaluationsParamsSchema)
        .mutation(async ({ input }) => {
            try {
                // Validate input
                if (input.evaluationIds.length === 0) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'No evaluation IDs provided',
                    });
                }

                const affected = await EvaluationDao.deleteEvaluations(
                    input.evaluationIds,
                );

                return {
                    success: true,
                    message: `Successfully deleted ${affected} evaluation(s)`,
                } as ResponseBody;
            } catch (error) {
                console.error('Error deleting evaluations:', error);

                // If it's already a TRPCError, re-throw it
                if (error instanceof TRPCError) {
                    throw error;
                }

                // For other errors, throw a detailed TRPCError
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message:
                        error instanceof Error
                            ? `Failed to delete evaluations: ${error.message}`
                            : 'Failed to delete evaluations',
                });
            }
        }),

    /**
     * Get the evaluations tasks with pagination
     */
    getEvaluationTasks: t.procedure
        .input(GetEvaluationTasksParamsSchema)
        .query(async ({ input }) => {
            console.log(JSON.stringify(input, null, 2));
            // First validate the evaluationId and get the evaluationDir
            try {
                const evaluation = await EvaluationDao.getEvaluation(
                    input.evaluationId,
                );
                if (!evaluation) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: `Evaluation with id ${input.evaluationId} does not exist`,
                    });
                }

                // Read the tasks from the evaluationDir
                return await FileDao.getEvaluationTasks(
                    evaluation.evaluationDir,
                    {
                        pagination: input.pagination,
                        sort: input.sort,
                        filters: input.filters,
                    } as TableRequestParams,
                );
            } catch (error) {
                console.error('Error in getEvaluationTasks:', error);

                if (error instanceof TRPCError) {
                    throw error;
                }

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Failed to get evaluation tasks',
                });
            }
        }),

    getEvaluationTask: t.procedure
        .input(z.object({ evaluationId: z.string(), taskId: z.string() }))
        .query(async ({ input }) => {
            try {
                // First get the evaluationDir by evaluationId
                const evaluation = await EvaluationDao.getEvaluation(
                    input.evaluationId,
                );
                if (!evaluation) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: `Evaluation with id ${input.evaluationId} does not exist`,
                    });
                }

                // Then read the task from the evaluationDir
                return await FileDao.getEvaluationTask(
                    evaluation.evaluationDir,
                    input.taskId,
                );
            } catch (error) {
                console.error('Error in getEvaluationTask:', error);
            }
        }),

    /**
     * Get the tags used in an evaluation
     *
     * @param evaluationId - The ID of the evaluation
     * @returns Array of tags used in the evaluation
     */
    getEvaluationTags: t.procedure
        .input(z.object({ evaluationId: z.string() }))
        .query(async ({ input }) => {
            try {
                const evaluation = await EvaluationDao.getEvaluation(
                    input.evaluationId,
                );
                if (!evaluation) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: `Evaluation with id ${input.evaluationId} does not exist`,
                    });
                }
                return await FileDao.getAllEvaluationTags(
                    evaluation.evaluationDir,
                );
            } catch (error) {
                console.error('Error in getEvaluationTags:', error);

                if (error instanceof TRPCError) {
                    throw error;
                }

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Failed to get evaluation tasks',
                });
            }
        }),
});

export type AppRouter = typeof appRouter;
