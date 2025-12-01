import { spawn } from 'child_process';
import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { ContentBlocks, Status } from '../../../shared/src/types/messageForm';
import {
    BackendResponse,
    FridayReply,
    InputRequestData,
    OverviewData,
    Reply,
    RunData,
    SocketEvents,
    SocketRoomName,
} from '../../../shared/src/types/trpc';
import { RunDao } from '../dao/Run';

import dayjs from 'dayjs';
import * as fs from 'node:fs';
import { ConfigManager, PATHS } from '../../../shared/src';
import {
    FridayConfig,
    FridayConfigManager,
} from '../../../shared/src/config/friday';
import { SpanData } from '../../../shared/src/types/trace';
import { FridayAppMessageDao } from '../dao/FridayAppMessage';
import { InputRequestDao } from '../dao/InputRequest';
import { SpanDao } from '../dao/Trace';
import { ReplyingStateManager } from '../services/ReplyingStateManager';

export class SocketManager {
    private static io: Server;

    static close() {
        if (this.io) {
            this.io.close();
        }
    }

    static async sendInterruptSignalToFriday() {
        this.io.of('/friday').emit(SocketEvents.server.interruptReply);
    }

    static init(httpServer: HttpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: '*',
            },
            maxHttpBufferSize: Infinity,
        });

        const fridayNamespace = this.io.of('/friday');
        fridayNamespace.on('connection', (socket) => {
            console.debug(`${socket.id}: Friday app client connected`);

            socket.on('disconnect', () => {
                console.debug(`${socket.id}: Friday app client disconnected`);
            });
        });

        // Python client connection
        const pythonNamespace = this.io.of('/python');
        pythonNamespace.on('connection', (socket) => {
            const runId = socket.handshake.auth.run_id;
            console.debug(`${socket.id}: Python client connected`);

            socket.on('disconnect', async () => {
                // Delete the input requests
                await InputRequestDao.deleteInputRequestsByRunId(runId);

                this.changeRunStatusAndTriggerEvents(runId, Status.DONE).catch(
                    (error) => {
                        console.error(error);
                        throw error;
                    },
                );
            });
        });

        const clientNamespace = this.io.of('/client');
        clientNamespace.on('connection', (socket) => {
            console.debug('Client connected');

            socket.on(SocketEvents.client.joinProjectListRoom, () => {
                socket.join(SocketRoomName.ProjectListRoom);
                console.debug(
                    `${socket.id}: joined room: ${SocketRoomName.ProjectListRoom}`,
                );

                RunDao.getAllProjects()
                    .then((projects) => {
                        // Push projects to the client
                        socket.emit(SocketEvents.server.pushProjects, projects);
                    })
                    .catch((error) => {
                        console.error(error);
                        throw error;
                    });
            });

            socket.on(
                SocketEvents.client.joinProjectRoom,
                async (project: string, callback) => {
                    const projectExist = await RunDao.doesProjectExist(project);
                    if (!projectExist) {
                        callback({
                            success: false,
                            message: `Project ${project} not found`,
                        });
                    } else {
                        socket.join(`project-${project}`);
                        console.debug(
                            `${socket.id}: joined room: project-${project}`,
                        );

                        // Return runs to this socket/client
                        RunDao.getAllProjectRuns(project)
                            .then((runs) => {
                                // Push runs to the client
                                socket.emit(
                                    SocketEvents.server.pushRunsData,
                                    runs,
                                );
                            })
                            .catch((error) => {
                                console.error(error);
                                throw error;
                            });
                    }
                },
            );

            socket.on(
                SocketEvents.client.joinRunRoom,
                async (runId: string, callback) => {
                    const runExist = await RunDao.doesRunExist(runId);
                    if (!runExist) {
                        callback({
                            success: false,
                            message: `Run ${runId} not found`,
                        });
                    } else {
                        socket.join(`run-${runId}`);
                        console.debug(
                            `${socket.id}: joined room: run-${runId}`,
                        );

                        // Return run data, input requests and messages to this socket/client
                        RunDao.getRunData(runId)
                            .then((data) => {
                                socket.emit(
                                    SocketEvents.server.pushRunData,
                                    data.runData,
                                );
                                socket.emit(
                                    SocketEvents.server.pushInputRequests,
                                    data.inputRequests,
                                );
                                // 对data.replies.messages按时间排序
                                data.replies.forEach((reply) => {
                                    reply.messages.sort((a, b) => {
                                        return a.timestamp.localeCompare(
                                            b.timestamp,
                                        );
                                    });
                                });

                                socket.emit(
                                    SocketEvents.server.pushMessages,
                                    data.replies,
                                );
                                socket.emit(
                                    SocketEvents.server.pushSpans,
                                    data.spans,
                                );
                            })
                            .catch((error) => {
                                console.error(error);
                                throw error;
                            });

                        // Return model invocation data
                        SpanDao.getModelInvocationData(runId).then((data) => {
                            socket.emit(
                                SocketEvents.server.pushModelInvocationData,
                                data,
                            );
                        });
                    }
                },
            );

            socket.on(
                SocketEvents.client.sendUserInputToServer,
                async (
                    requestId: string,
                    blocksInput: ContentBlocks,
                    structuredInput: Record<string, unknown> | null,
                    callback,
                ) => {
                    const inputRequest =
                        await InputRequestDao.getInputRequestByRequestId(
                            requestId,
                        );

                    if (inputRequest === null) {
                        callback({
                            success: false,
                            message: `Input request ${requestId} not found`,
                        });
                    } else {
                        const runId = inputRequest.runId;
                        await InputRequestDao.deleteInputRequest(requestId);

                        // If input requests are empty, change the run status to finished
                        const res = await RunDao.getRunData(runId);
                        if (res.inputRequests.length === 0) {
                            this.changeRunStatusAndTriggerEvents(
                                runId,
                                Status.RUNNING,
                            ).catch((error) => {
                                console.error(error);
                                throw error;
                            });
                        }

                        // Emit the input to the python client
                        this.io
                            .of('/python')
                            .emit(
                                SocketEvents.server.forwardUserInput,
                                requestId,
                                blocksInput,
                                structuredInput,
                            );
                    }
                },
            );

            socket.on(SocketEvents.client.joinOverviewRoom, async () => {
                socket.join(SocketRoomName.OverviewRoom);
                console.debug(
                    `${socket.id}: joined room: ${SocketRoomName.OverviewRoom}`,
                );

                // Return current overview data
                const res = await this._getOverViewData();
                socket.emit(SocketEvents.server.pushOverviewData, res);
            });

            socket.on(SocketEvents.client.leaveRoom, (room: string) => {
                socket.leave(room);
                console.debug(`${socket.id}: left room: ${room}`);
            });

            socket.on(
                SocketEvents.client.deleteProjects,
                async (projects: string[], callback) => {
                    try {
                        await RunDao.deleteProjects(projects);
                        callback({
                            success: true,
                            message: `Success: ${projects.length} project deleted`,
                        });
                        // Update projectListRoom, overviewRoom,
                        this.broadcastOverviewDataToDashboardRoom();
                        this.broadcastRunToProjectListRoom();
                    } catch (error) {
                        callback({
                            success: false,
                            message: `Error: ${error}`,
                        });
                    }
                },
            );

            socket.on(
                SocketEvents.client.deleteRuns,
                async (runIds: string[], callback) => {
                    try {
                        const nDelete = await RunDao.deleteRuns(runIds);
                        callback({
                            success: nDelete === runIds.length,
                            message: `Deleted ${nDelete} runs`,
                        });
                        // Update data to overviewRoom, projectRoom
                        this.broadcastOverviewDataToDashboardRoom();
                        this.broadcastRunToProjectListRoom();
                    } catch (error) {
                        callback({
                            success: false,
                            message: `Failed to delete runs: ${error}`,
                        });
                    }
                },
            );

            // friday app
            socket.on(SocketEvents.client.getFridayConfig, async (callback) => {
                console.debug(`${socket.id}: getFridayConfig`);

                try {
                    // Send config to the client
                    const fridayConfig =
                        FridayConfigManager.getInstance().getConfig();
                    callback({
                        success: true,
                        data: fridayConfig,
                        message: 'Get Friday config successfully',
                    } as BackendResponse);
                } catch (error) {
                    console.error(error);
                    callback({
                        success: false,
                        data: null,
                        message: `Failed to get Friday config: ${error}`,
                    });
                }
            });

            socket.on(
                SocketEvents.client.saveFridayConfig,
                async (config: FridayConfig, callback) => {
                    const fridayConfigManager =
                        FridayConfigManager.getInstance();

                    // Save the config to the file
                    fridayConfigManager.updateConfig(config);
                    callback({
                        success: true,
                        message: 'Save Friday config successfully',
                    });
                },
            );

            socket.on(
                SocketEvents.client.installFridayRequirements,
                async (
                    pythonEnv: string,
                    callback: (res: BackendResponse) => void,
                ) => {
                    const fridayConfigManager =
                        FridayConfigManager.getInstance();
                    const res =
                        await fridayConfigManager.installRequirements(
                            pythonEnv,
                        );
                    callback(res);
                },
            );

            socket.on(
                SocketEvents.client.joinFridayAppRoom,
                async (callback) => {
                    console.debug(
                        `${socket.id}: joined room: ${SocketRoomName.FridayAppRoom}`,
                    );
                    socket.join(SocketRoomName.FridayAppRoom);

                    const replyingManager = ReplyingStateManager.getInstance();
                    // Push the replying state
                    socket.emit(
                        SocketEvents.server.pushReplyingState,
                        replyingManager.getReplyingState(),
                    );

                    // Push the replies to the client
                    FridayAppMessageDao.getRepliesBefore(undefined, 100)
                        .then((res) => {
                            socket.emit(
                                SocketEvents.server.pushReplies,
                                res.replies,
                                res.hasMore,
                            );
                        })
                        .catch((error) => {
                            console.error(error);
                            callback({
                                success: false,
                                message: `Failed to get replies: ${error}`,
                            } as BackendResponse);
                        });
                },
            );

            socket.on(
                SocketEvents.client.verifyFridayConfig,
                async (
                    pythonEnv: string,
                    callback: (response: BackendResponse) => void,
                ) => {
                    console.debug(`${socket.id}: verifyPythonEnv:`, pythonEnv);
                    // Verify if python exists
                    const result =
                        FridayConfigManager.getInstance().verifyPythonEnv(
                            pythonEnv,
                        );
                    callback(result);
                },
            );

            socket.on(
                SocketEvents.client.sendUserInputToFridayApp,
                async (
                    name: string,
                    role: string,
                    content: ContentBlocks,
                    callback: (response: BackendResponse) => void,
                ) => {
                    const replyingManager = ReplyingStateManager.getInstance();

                    const replyId = crypto.randomUUID();
                    const msgId = crypto.randomUUID();

                    FridayAppMessageDao.saveReplyMessage(
                        replyId,
                        {
                            id: msgId,
                            name: name,
                            role: role,
                            content: content,
                            metadata: {},
                            timestamp: dayjs().format(
                                'YYYY-MM-DD HH:mm:ss.SSS',
                            ),
                        },
                        true,
                    )
                        .then((reply) => {
                            this.broadcastReplyToFridayAppRoom(reply);
                        })
                        .catch((error) => {
                            console.error(error);
                            callback({
                                success: false,
                                message: `Failed to add reply: ${error}`,
                            } as BackendResponse);
                        });

                    // Send the message to the python client
                    // TODO: move somewhere
                    const config = ConfigManager.getInstance().getConfig();

                    // Broad the replying state to the Friday app room
                    replyingManager.setReplyingState(true);
                    this.broadcastReplyingStateToFridayAppRoom();

                    const fridayConfigManager =
                        FridayConfigManager.getInstance();
                    const fridayConfig = fridayConfigManager.getConfig();
                    if (!fridayConfig) {
                        callback({
                            success: false,
                            message:
                                'Friday config not found. Please set it up first.',
                        } as BackendResponse);
                        return;
                    }

                    // Prepare the arguments for the Python script
                    const mainScriptPath = fridayConfig.mainScriptPath
                        ? fridayConfig.mainScriptPath
                        : fridayConfigManager.getDefaultMainScriptPath();
                    const args = [
                        mainScriptPath,
                        '--query',
                        JSON.stringify(content),
                        '--studio_url',
                        `http://localhost:${config.port}`,
                    ];
                    console.debug(fridayConfig);
                    for (const [key, value] of Object.entries(fridayConfig)) {
                        if (key !== 'pythonEnv' && key !== 'mainScriptPath') {
                            if (typeof value === 'object') {
                                args.push(`--${key}`, JSON.stringify(value));
                            } else {
                                args.push(`--${key}`, value);
                            }
                        }
                    }

                    runPythonScript(fridayConfig.pythonEnv, args)
                        .then((result) => {
                            if (result.success) {
                                console.debug(
                                    '[PYTHON SCRIPT OUTPUT]:',
                                    result.data,
                                );
                            } else {
                                console.error(
                                    '[PYTHON SCRIPT ERROR]:',
                                    result.error,
                                );
                                callback({
                                    success: false,
                                    message: result.error,
                                } as BackendResponse);
                            }
                        })
                        .catch((error) => {
                            console.error('[PYTHON SCRIPT ERROR]:', error);
                            callback({
                                success: false,
                                message: error,
                            } as BackendResponse);
                        })
                        .finally(() => {
                            replyingManager.setReplyingState(false);
                            this.broadcastReplyingStateToFridayAppRoom();
                        });
                },
            );

            socket.on(
                SocketEvents.client.interruptReplyOfFridayApp,
                async () => {
                    await this.sendInterruptSignalToFriday();
                },
            );

            socket.on(SocketEvents.client.cleanHistoryOfFridayApp, async () => {
                FridayAppMessageDao.cleanHistoryMessages().then(() => {
                    const filePath = PATHS.getFridayDialogHistoryPath();
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.debug(`Deleted file: ${filePath}`);
                    } else {
                        console.warn(`File not found: ${filePath}`);
                    }
                    // TODO: 告知client
                    this.broadcastReplyToFridayAppRoom(undefined, true);
                });
            });

            socket.on('disconnect', () => {
                console.debug('Client disconnected');
            });
        });
    }

    /*
     * Emit events to the project list room.
     */
    static broadcastRunToProjectListRoom() {
        RunDao.getAllProjects()
            .then((projects) => {
                // Push projects to the client
                this.io
                    .of('/client')
                    .to(SocketRoomName.ProjectListRoom)
                    .emit(SocketEvents.server.pushProjects, projects);
            })
            .catch((error) => {
                console.error(error);
                throw error;
            });
    }

    static broadcastRunToProjectRoom(project: string) {
        RunDao.getAllProjectRuns(project)
            .then((runs) => {
                // Push runs to the client
                this.io
                    .of('/client')
                    .to(`project-${project}`)
                    .emit(SocketEvents.server.pushRunsData, runs);
            })
            .catch((error) => {
                console.error(error);
                throw error;
            });
    }

    /*
     * Emit events to the run room.
     */
    static broadcastMessageToRunRoom(runId: string, reply: Reply) {
        this.io
            .of('/client')
            .to(`run-${runId}`)
            .emit(SocketEvents.server.pushMessages, [reply] as Reply[]);
    }

    static broadcastSpanDataToRunRoom(spanDataArray: SpanData[]) {
        // Group spans by runId
        const groupedSpans: Record<string, SpanData[]> = {};
        spanDataArray.forEach((spanData) => {
            if (!groupedSpans[spanData.conversationId]) {
                groupedSpans[spanData.conversationId] = [];
            }
            groupedSpans[spanData.conversationId].push(spanData);
        });

        // Send grouped spans to each run room
        for (const runId in groupedSpans) {
            this.io
                .of('/client')
                .to(`run-${runId}`)
                .emit(SocketEvents.server.pushSpans, groupedSpans[runId]);
            this.broadcastModelInvocationDataToRunRoom(runId);
        }
    }

    static broadcastInputRequestToRunRoom(
        runId: string,
        inputRequest: InputRequestData,
    ) {
        this.io
            .of('/client')
            .to(`run-${runId}`)
            .emit(SocketEvents.server.pushInputRequests, [inputRequest]);
    }

    static broadcastRunDataToRunRoom(runId: string, runData: RunData) {
        this.io
            .of('/client')
            .to(`run-${runId}`)
            .emit(SocketEvents.server.pushRunData, runData);
    }

    static clearInputRequestsToRunRoom(runId: string) {
        this.io
            .of('/client')
            .to(`run-${runId}`)
            .emit(SocketEvents.server.clearInputRequests);
    }

    static async changeRunStatusAndTriggerEvents(
        runId: string,
        newStatus: Status,
    ) {
        const runExist = await RunDao.doesRunExist(runId);

        if (runExist) {
            // Update the run status to "finished"
            await RunDao.changeRunStatus(runId, newStatus);

            // Find the project by runId
            const res = await RunDao.getRunData(runId);
            const project = res.runData.project;

            // Broadcast projects to all clients in the ProjectList room
            this.broadcastRunToProjectListRoom();
            // Broadcast runs to all clients in the project room
            this.broadcastRunToProjectRoom(project);
            // Broadcast run data to all clients in the run room
            this.broadcastRunDataToRunRoom(runId, res.runData);

            if (newStatus === Status.DONE) {
                // Clear the input requests for all clients in the run room
                this.clearInputRequestsToRunRoom(runId);
            }
        }
    }

    static broadcastOverviewDataToDashboardRoom() {
        this._getOverViewData()
            .then((res) => {
                this.io
                    .of('/client')
                    .to(SocketRoomName.OverviewRoom)
                    .emit(SocketEvents.server.pushOverviewData, res);
            })
            .catch((error) => {
                console.error(error);
                throw error;
            });
    }

    static async _getOverViewData() {
        const res1 = await RunDao.getRunViewData();
        const res2 = await SpanDao.getModelInvocationViewData();

        return {
            ...res1,
            ...res2,
        } as OverviewData;
    }

    static broadcastModelInvocationDataToRunRoom(runId: string) {
        SpanDao.getModelInvocationData(runId).then((data) => {
            this.io
                .of('/client')
                .to(`run-${runId}`)
                .emit(SocketEvents.server.pushModelInvocationData, data);
        });
    }

    static broadcastReplyToFridayAppRoom(
        reply?: FridayReply,
        override: boolean = false,
    ) {
        this.io
            .of('/client')
            .to(SocketRoomName.FridayAppRoom)
            .emit(
                SocketEvents.server.pushReplies,
                reply === undefined ? [] : [reply],
                false,
                override,
            );
    }

    static broadcastReplyingStateToFridayAppRoom() {
        const replyingManager = ReplyingStateManager.getInstance();
        this.io
            .of('/client')
            .to(SocketRoomName.FridayAppRoom)
            .emit(
                SocketEvents.server.pushReplyingState,
                replyingManager.getReplyingState(),
            );
    }
}

interface PythonResult {
    success: boolean;
    data?: string;
    error?: string;
}

export async function runPythonScript(
    pythonEnv: string,
    commands: string[],
): Promise<PythonResult> {
    return new Promise((resolve) => {
        console.debug('The execute command:', pythonEnv, commands);
        const pythonProcess = spawn(pythonEnv, commands, {
            env: {
                ...process.env,
                FORCE_COLOR: '0',
            },
        });

        let output = '';
        let errorOutput = '';

        // 收集标准输出
        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        // 收集错误输出
        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        // 进程结束时处理结果
        pythonProcess.on('close', (code) => {
            if (code === 0) {
                resolve({
                    success: true,
                    data: output.trim(),
                });
            } else {
                resolve({
                    success: false,
                    error: errorOutput.trim(),
                });
            }
        });
    });
}
