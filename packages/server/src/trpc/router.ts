import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
    BlockType,
    ContentBlocks,
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
    TableRequestParamsSchema,
    Trace,
} from '../../../shared/src';
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
        z.array(z.union([textBlock, imageBlock, audioBlock, videoBlock])),
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

    pushCurrentPlanToFridayApp: t.procedure
        .input(
            z.object({
                currentPlan: z.any().nullable(),
                historicalPlans: z.array(z.any()).optional(),
            }),
        )
        .mutation(async ({ input }) => {
            try {
                SocketManager.broadcastCurrentPlanToFridayAppRoom(
                    input.currentPlan,
                    input.historicalPlans,
                );
            } catch (error) {
                console.error(error);
                throw error;
            }
        }),

    getFridayPlans: t.procedure.query(async () => {
        try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const path = await import('path');
            const fs = await import('fs');
            const crypto = await import('crypto');
            const execAsync = promisify(exec);

            // Get Friday config
            const fridayConfig = FridayConfigManager.getInstance().getConfig();
            if (!fridayConfig || !fridayConfig.pythonEnv) {
                throw new Error('Friday config not found');
            }

            // Get the Friday app path (packages/app/friday)
            const fridayAppPath = path.resolve(
                __dirname,
                '../../../app/friday',
            );

            // Create a temporary Python script with unique name to avoid race conditions
            const tmpScript = path.join(
                fridayAppPath,
                `.get_friday_plans_${crypto.randomUUID()}.py`,
            );
            const scriptContent = [
                'import sys, json',
                `sys.path.insert(0, '${fridayAppPath.replace(/\\/g, '/')}' )`,
                'from plan_manager.api import get_plans_from_storage',
                'result = get_plans_from_storage()',
                'print(json.dumps(result))',
                '',
            ].join('\n');

            fs.writeFileSync(tmpScript, scriptContent);

            try {
                const { stdout } = await execAsync(
                    `${fridayConfig.pythonEnv} "${tmpScript}"`,
                );

                const trimmed = stdout.trim();
                if (!trimmed) {
                    return {
                        currentPlan: null,
                        historicalPlans: [],
                    };
                }

                const data = JSON.parse(trimmed);

                return {
                    currentPlan: data.currentPlan ?? null,
                    historicalPlans: data.historicalPlans ?? [],
                };
            } finally {
                // Clean up temporary script
                try {
                    fs.unlinkSync(tmpScript);
                } catch {
                    // Ignore cleanup errors
                }
            }
        } catch (error) {
            console.error(
                '[getFridayPlans] Failed to get Friday plans:',
                error,
            );
            return {
                currentPlan: null,
                historicalPlans: [],
            };
        }
    }),

    reviseFridayPlan: t.procedure
        .input(
            z.object({
                subtaskIdx: z.number(),
                action: z.enum(['add', 'revise', 'delete']),
                subtask: z.any().optional(),
            }),
        )
        .mutation(async ({ input }) => {
            try {
                const { exec } = await import('child_process');
                const { promisify } = await import('util');
                const path = await import('path');
                const fs = await import('fs');
                const execAsync = promisify(exec);

                const fridayConfig =
                    FridayConfigManager.getInstance().getConfig();
                if (!fridayConfig || !fridayConfig.pythonEnv) {
                    throw new Error('Friday config not found');
                }

                const fridayAppPath = path.resolve(
                    __dirname,
                    '../../../app/friday',
                );
                const requestId = crypto.randomUUID();
                const tmpScript = path.join(
                    fridayAppPath,
                    `.revise_friday_plan_${requestId}.py`,
                );
                const tmpInput = path.join(
                    fridayAppPath,
                    `.revise_friday_plan_input_${requestId}.json`,
                );

                // Write user data to a separate JSON file to avoid code injection
                fs.writeFileSync(
                    tmpInput,
                    JSON.stringify({
                        action: input.action,
                        subtaskIdx: input.subtaskIdx,
                        subtask: input.subtask ?? null,
                    }),
                );

                // Script contains only static code - no user data embedded
                const scriptContent = [
                    'import sys, json',
                    `sys.path.insert(0, '${fridayAppPath.replace(/\\/g, '/')}')`,
                    'from plan_manager.api import revise_plan',
                    'with open(sys.argv[1]) as f: data = json.load(f)',
                    'result = revise_plan(data["action"], data["subtaskIdx"], data.get("subtask"))',
                    'print(json.dumps(result))',
                    '',
                ].join('\n');

                fs.writeFileSync(tmpScript, scriptContent);

                try {
                    const { stdout } = await execAsync(
                        `${fridayConfig.pythonEnv} "${tmpScript}" "${tmpInput}"`,
                    );

                    const trimmed = stdout.trim();
                    const data = trimmed ? JSON.parse(trimmed) : {};

                    return {
                        success: true,
                        message: data.message || 'Plan revised successfully',
                    };
                } finally {
                    try {
                        fs.unlinkSync(tmpScript);
                    } catch {
                        // Ignore cleanup errors
                    }
                    try {
                        fs.unlinkSync(tmpInput);
                    } catch {
                        // Ignore cleanup errors
                    }
                }
            } catch (error) {
                console.error(
                    '[reviseFridayPlan] Failed to revise plan:',
                    error,
                );
                return {
                    success: false,
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Failed to revise plan',
                };
            }
        }),

    updateFridaySubtaskState: t.procedure
        .input(
            z.object({
                subtaskIdx: z.number(),
                state: z.enum(['todo', 'in_progress', 'abandoned']),
            }),
        )
        .mutation(async ({ input }) => {
            try {
                const { exec } = await import('child_process');
                const { promisify } = await import('util');
                const path = await import('path');
                const fs = await import('fs');
                const crypto = await import('crypto');
                const execAsync = promisify(exec);

                const fridayConfig =
                    FridayConfigManager.getInstance().getConfig();
                if (!fridayConfig || !fridayConfig.pythonEnv) {
                    throw new Error('Friday config not found');
                }

                const fridayAppPath = path.resolve(
                    __dirname,
                    '../../../app/friday',
                );
                const requestId = crypto.randomUUID();
                const tmpScript = path.join(
                    fridayAppPath,
                    `.update_friday_subtask_${requestId}.py`,
                );
                const tmpInput = path.join(
                    fridayAppPath,
                    `.update_friday_subtask_input_${requestId}.json`,
                );

                // Write user data to a separate JSON file to avoid code injection
                fs.writeFileSync(
                    tmpInput,
                    JSON.stringify({
                        subtaskIdx: input.subtaskIdx,
                        state: input.state,
                    }),
                );

                // Script contains only static code - no user data embedded
                const scriptContent = [
                    'import sys, json',
                    `sys.path.insert(0, '${fridayAppPath.replace(/\\/g, '/')}')`,
                    'from plan_manager.api import update_subtask_state',
                    'with open(sys.argv[1]) as f: data = json.load(f)',
                    'result = update_subtask_state(data["subtaskIdx"], data["state"])',
                    'print(json.dumps(result))',
                    '',
                ].join('\n');

                fs.writeFileSync(tmpScript, scriptContent);

                try {
                    const { stdout } = await execAsync(
                        `${fridayConfig.pythonEnv} "${tmpScript}" "${tmpInput}"`,
                    );

                    const trimmed = stdout.trim();
                    const data = trimmed ? JSON.parse(trimmed) : {};

                    return {
                        success: true,
                        message:
                            data.message ||
                            'Subtask state updated successfully',
                    };
                } finally {
                    try {
                        fs.unlinkSync(tmpScript);
                    } catch {
                        // Ignore cleanup errors
                    }
                    try {
                        fs.unlinkSync(tmpInput);
                    } catch {
                        // Ignore cleanup errors
                    }
                }
            } catch (error) {
                console.error(
                    '[updateFridaySubtaskState] Failed to update subtask state:',
                    error,
                );
                return {
                    success: false,
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Failed to update subtask state',
                };
            }
        }),

    finishFridaySubtask: t.procedure
        .input(
            z.object({
                subtaskIdx: z.number(),
                outcome: z.string(),
            }),
        )
        .mutation(async ({ input }) => {
            try {
                const { exec } = await import('child_process');
                const { promisify } = await import('util');
                const path = await import('path');
                const fs = await import('fs');
                const crypto = await import('crypto');
                const execAsync = promisify(exec);

                const fridayConfig =
                    FridayConfigManager.getInstance().getConfig();
                if (!fridayConfig || !fridayConfig.pythonEnv) {
                    throw new Error('Friday config not found');
                }

                const fridayAppPath = path.resolve(
                    __dirname,
                    '../../../app/friday',
                );
                const requestId = crypto.randomUUID();
                const tmpScript = path.join(
                    fridayAppPath,
                    `.finish_friday_subtask_${requestId}.py`,
                );
                const tmpInput = path.join(
                    fridayAppPath,
                    `.finish_friday_subtask_input_${requestId}.json`,
                );

                // Write user data to a separate JSON file to avoid code injection
                fs.writeFileSync(
                    tmpInput,
                    JSON.stringify({
                        subtaskIdx: input.subtaskIdx,
                        outcome: input.outcome,
                    }),
                );

                // Script contains only static code - no user data embedded
                const scriptContent = [
                    'import sys, json',
                    `sys.path.insert(0, '${fridayAppPath.replace(/\\/g, '/')}')`,
                    'from plan_manager.api import finish_subtask',
                    'with open(sys.argv[1]) as f: data = json.load(f)',
                    'result = finish_subtask(data["subtaskIdx"], data["outcome"])',
                    'print(json.dumps(result))',
                    '',
                ].join('\n');

                fs.writeFileSync(tmpScript, scriptContent);

                try {
                    const { stdout } = await execAsync(
                        `${fridayConfig.pythonEnv} "${tmpScript}" "${tmpInput}"`,
                    );

                    const trimmed = stdout.trim();
                    const data = trimmed ? JSON.parse(trimmed) : {};

                    return {
                        success: true,
                        message:
                            data.message || 'Subtask finished successfully',
                    };
                } finally {
                    try {
                        fs.unlinkSync(tmpScript);
                    } catch {
                        // Ignore cleanup errors
                    }
                    try {
                        fs.unlinkSync(tmpInput);
                    } catch {
                        // Ignore cleanup errors
                    }
                }
            } catch (error) {
                console.error(
                    '[finishFridaySubtask] Failed to finish subtask:',
                    error,
                );
                return {
                    success: false,
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Failed to finish subtask',
                };
            }
        }),

    reorderFridaySubtasks: t.procedure
        .input(
            z.object({
                fromIndex: z.number(),
                toIndex: z.number(),
            }),
        )
        .mutation(async ({ input }) => {
            try {
                const { exec } = await import('child_process');
                const { promisify } = await import('util');
                const path = await import('path');
                const fs = await import('fs');
                const crypto = await import('crypto');
                const execAsync = promisify(exec);

                const fridayConfig =
                    FridayConfigManager.getInstance().getConfig();
                if (!fridayConfig || !fridayConfig.pythonEnv) {
                    throw new Error('Friday config not found');
                }

                const fridayAppPath = path.resolve(
                    __dirname,
                    '../../../app/friday',
                );
                const requestId = crypto.randomUUID();
                const tmpScript = path.join(
                    fridayAppPath,
                    `.reorder_friday_subtasks_${requestId}.py`,
                );
                const tmpInput = path.join(
                    fridayAppPath,
                    `.reorder_friday_subtasks_input_${requestId}.json`,
                );

                // Write user data to a separate JSON file to avoid code injection
                fs.writeFileSync(
                    tmpInput,
                    JSON.stringify({
                        fromIndex: input.fromIndex,
                        toIndex: input.toIndex,
                    }),
                );

                // Script contains only static code - no user data embedded
                const scriptContent = [
                    'import sys, json',
                    `sys.path.insert(0, '${fridayAppPath.replace(/\\/g, '/')}')`,
                    'from plan_manager.api import reorder_subtasks',
                    'with open(sys.argv[1]) as f: data = json.load(f)',
                    'result = reorder_subtasks(data["fromIndex"], data["toIndex"])',
                    'print(json.dumps(result))',
                    '',
                ].join('\n');

                fs.writeFileSync(tmpScript, scriptContent);

                try {
                    const { stdout } = await execAsync(
                        `${fridayConfig.pythonEnv} "${tmpScript}" "${tmpInput}"`,
                    );

                    const trimmed = stdout.trim();
                    const data = trimmed ? JSON.parse(trimmed) : {};

                    return {
                        success: data.success ?? true,
                        message:
                            data.message || 'Subtasks reordered successfully',
                    };
                } finally {
                    try {
                        fs.unlinkSync(tmpScript);
                    } catch {
                        // Ignore cleanup errors
                    }
                    try {
                        fs.unlinkSync(tmpInput);
                    } catch {
                        // Ignore cleanup errors
                    }
                }
            } catch (error) {
                console.error(
                    '[reorderFridaySubtasks] Failed to reorder subtasks:',
                    error,
                );
                return {
                    success: false,
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Failed to reorder subtasks',
                };
            }
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
                },
            } as ResponseBody<{
                path: string;
                size: number;
                formattedSize: string;
                fridayConfigPath: string;
                fridayHistoryPath: string;
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
});

export type AppRouter = typeof appRouter;
