import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
    InputRequestData,
    RunData,
    TableData,
    ProjectData,
    TableRequestParamsSchema,
    ResponseBody,
} from '../../../shared/src';
import {
    BlockType,
    ContentBlocks,
    MessageForm,
    Status,
} from '../../../shared/src';
import { RunDao } from '../dao/Run';
import { InputRequestDao } from '../dao/InputRequest';
import { MessageDao } from '../dao/Message';
import { SocketManager } from './socket';
import { FridayConfigManager } from '../../../shared/src/config/friday';
import { FridayAppMessageDao } from '../dao/FridayAppMessage';

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
                run_dir: z.string(),
                pid: z.number(),
                status: z.enum(Object.values(Status) as [string, ...string[]]),
            }),
        )
        .mutation(async ({ input }) => {
            const runData = {
                id: input.id,
                project: input.project,
                name: input.name,
                timestamp: input.timestamp,
                run_dir: input.run_dir,
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

    pushMessage: t.procedure
        .input(
            z.object({
                runId: z.string(),
                replyId: z.string().nullable(),
                msg: z.object({
                    id: z.string(),
                    name: z.string(),
                    role: z.string(),
                    content: contentType,
                    metadata: z.unknown(),
                    timestamp: z.string(),
                }),
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

            // Save the message to the database
            const msgFormData = {
                id: input.msg.id,
                runId: input.runId,
                replyId: input.replyId,
                msg: {
                    name: input.msg.name,
                    role: input.msg.role,
                    content: input.msg.content,
                    metadata: input.msg.metadata,
                    timestamp: input.msg.timestamp,
                },
            } as MessageForm;
            MessageDao.saveMessage(msgFormData)
                .then(() => {
                    console.debug(`RUN-${input.runId}: message saved`);
                    // Broadcast the message to the run room
                    console.debug(
                        `Broadcasting message to room run-${input.runId}`,
                    );
                    SocketManager.broadcastMessageToRunRoom(
                        input.runId,
                        msgFormData,
                    );
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
            FridayAppMessageDao.saveReplyMessage(
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
            )
                .then((reply) => {
                    // Broadcast to all the clients in the FridayAppRoom
                    SocketManager.broadcastReplyToFridayAppRoom(reply);
                })
                .catch((error) => {
                    console.error(error);
                    throw error;
                });
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
        .query(
            async ({ input }) => {
                try {
                    const result = await RunDao.getProjects(
                        input.pagination,
                        input.sort,
                        input.filters,
                    );

                    return {
                        success: true,
                        message: 'Projects fetched successfully',
                        data: result,
                    } as ResponseBody<TableData<ProjectData>>;
                } catch (error) {
                    console.error('Error fetching projects:', error);
                    return {
                        success: false,
                        message: error instanceof Error ? error.message : 'Unknown error',
                    } as ResponseBody<TableData<ProjectData>>;
                }
            }
        ),
});

export type AppRouter = typeof appRouter;
