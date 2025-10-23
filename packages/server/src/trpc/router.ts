import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import fs from 'fs';
import { InputRequestData, RunData } from '../../../shared/src';
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
import { verifyMetadataByVersion } from '@/trpc/utils-evaluation';
import path from 'path';
import { EvaluationDao } from '@/dao/evaluation';
import { Benchmark, EvaluationForm } from '../../../shared/src/types/evaluation';

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

    importEvaluation: t.procedure
        .input(
            z.object(
                {
                    evaluationDir: z.string(),
                }
            )
        )
        .mutation(
            async ({ input }) => {
                try {
                    // Check if the directory exists
                    if (fs.existsSync(input.evaluationDir) && fs.lstatSync(input.evaluationDir).isDirectory()) {
                        // Read the evaluation_meta.json file in the directory
                        const metaFile = `${input.evaluationDir}/evaluation_meta.json`;
                        if (fs.existsSync(metaFile)) {
                            // Read and parse the meta.json file
                            const metaData = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
                            // First the metaData should be an object
                            if (typeof metaData === 'object') {
                                // verify the metadata by version
                                verifyMetadataByVersion(metaData);

                                // 从metadata的下划线转成驼峰，并且添加evaluationDir字段记录地址
                                EvaluationDao.saveEvaluation(
                                    {
                                        id: `${metaData.benchmark.name}-${metaData.createdAt}`,
                                        evaluationName: metaData.evaluation_name,
                                        createdAt: metaData.created_at,
                                        totalRepeats: metaData.total_repeats,
                                        schemaVersion: metaData.schema_version,
                                        evaluationDir: input.evaluationDir,
                                        benchmark: {
                                            name: metaData.benchmark.name,
                                            description: metaData.benchmark.description,
                                            totalTasks: metaData.benchmark.total_tasks,
                                        } as Benchmark
                                    } as EvaluationForm
                                )
                                    .then(
                                        async () => {
                                            // Broadcast the new evaluation to all clients
                                            await SocketManager.broadcastEvaluationsToEvaluationRoom();
                                        }
                                    )
                                return { success: true, message: "Import evaluation successfully!", data: metaData };
                            } else {
                                return { success: false, message: "evaluation_meta is not a valid json object" };
                            }

                        } else {
                            return { success: false, message: `evaluation_meta.json file not found in ${input.evaluationDir}` };
                        }
                    } else {
                        return { success: false, message: "Directory not found or is not a directory" };
                    }
                } catch (error) {
                    console.error(error);
                    return { success: false, message: `Error: ${error}` };
                }
            }
        ),

    listDir: t.procedure
        .input(
            z.object(
                {path: z.string()}
            )
        )
        .mutation(
            async ({ input }) => {
                // TODO: check if the request is from localhost

                try {
                    if (fs.existsSync(input.path)) {
                        // 获取该目录下所有的文件和文件夹，只获取他们的名字，是否是文件夹，修改时间
                        const fileNames = fs.readdirSync(input.path).map(
                            fileName => {
                                const filePath = path.join(input.path, fileName);
                                const stats = fs.statSync(filePath);
                                return {
                                    name: fileName,
                                    path: filePath,
                                    isDirectory: stats.isDirectory(),
                                };
                            }
                        );
                        return {
                            success: true,
                            message: 'Directory listed successfully',
                            data: fileNames,
                        };
                    }
                    return { success: false, message: "Directory not exists" };

                } catch (error) {
                    console.error(error);
                    return { success: false, message: `Error: ${error}` };
                }
            }
        )
});

export type AppRouter = typeof appRouter;
