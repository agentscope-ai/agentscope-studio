import { z } from 'zod';
import { ContentBlocks, ContentType, Status } from './messageForm';
import { Usage } from './usage';

export const RegisterReplyParamsSchema = z.object({
    runId: z.string(),
    replyId: z.string(),
    replyRole: z.string(),
    replyName: z.string(),
    createdAt: z.string(),
});
export type RegisterReplyParams = z.infer<typeof RegisterReplyParamsSchema>;

export const SocketRoomName = {
    ProjectListRoom: 'ProjectListRoom',
    OverviewRoom: 'OverviewRoom',
    FridayAppRoom: 'FridayAppRoom',
};

export const SocketEvents = {
    python: {
        requestUserInput: 'requestUserInput',
    },
    server: {
        // To client:
        //  dashboard room
        pushOverviewData: 'pushOverviewData',
        //  projectList room
        pushProjects: 'pushProjects',
        //  project room
        pushRunsData: 'pushRunsData',
        //  run room
        pushRunData: 'pushRunData',
        pushInputRequests: 'pushInputRequests',
        clearInputRequests: 'clearInputRequests',
        pushMessages: 'pushMessages',
        pushSpans: 'pushSpans',
        pushModelInvocationData: 'pushModelInvocationData',
        // Friday app room
        pushReplies: 'pushReplies',
        pushReplyingState: 'pushReplyingState',
        interruptReply: 'interrupt',
        // To python:
        //  send the user input
        forwardUserInput: 'forwardUserInput',
    },
    client: {
        cleanHistoryOfFridayApp: 'cleanHistoryOfFridayApp',
        joinOverviewRoom: 'joinOverviewRoom',
        joinProjectListRoom: 'joinProjectListRoom',
        joinProjectRoom: 'joinProjectRoom',
        joinRunRoom: 'joinRunRoom',
        getFridayConfig: 'getFridayConfig',
        saveFridayConfig: 'saveFridayConfig',
        installFridayRequirements: 'installFridayRequirements',
        joinFridayAppRoom: 'joinFridayAppRoom',
        verifyFridayConfig: 'verifyFridayConfig',
        leaveRoom: 'leaveRoom',
        sendUserInputToServer: 'sendUserInputToServer',
        sendUserInputToFridayApp: 'sendUserInputToFridayApp',
        interruptReplyOfFridayApp: 'interruptReplyOfFridayApp',
        deleteProjects: 'deleteProjects',
        deleteRuns: 'deleteRuns',
    },
};

export interface InputRequestData {
    requestId: string;
    agentId: string;
    agentName: string;
    structuredInput: Record<string, unknown> | null;
}

// 在进入这个run页面的时候得到的数据
export interface RunData {
    id: string;
    project: string;
    name: string;
    timestamp: string;
    run_dir: string;
    pid: number;
    status: Status;
}

// 在进入project页面的时候获得的数据
export interface ProjectData {
    project: string;
    running: number;
    pending: number;
    finished: number;
    total: number;
    createdAt: string;
}

export interface MessageData {
    id: string;
    runId: string;
    replyId: string;
    name: string;
    role: string;
    content: ContentType;
    metadata: object;
    timestamp: string;
}

export interface Reply {
    replyId: string;
    replyName: string;
    replyRole: string;
    createdAt: string;
    finishedAt?: string;
    messages: Message[];
}

export interface Message {
    id: string;
    name: string;
    role: string;
    content: ContentType;
    timestamp: string;
    metadata: object;
}

export interface FridayReply {
    id: string;
    name: string;
    role: string;
    content: ContentBlocks;
    startTimeStamp: string;
    endTimeStamp?: string;
    finished: boolean;
}

export interface OverviewData {
    projectsWeekAgo: number;
    projectsMonthAgo: number;
    projectsYearAgo: number;
    runsWeekAgo: number;
    runsMonthAgo: number;
    runsYearAgo: number;
    modelInvocationsWeekAgo: number;
    modelInvocationsMonthAgo: number;
    modelInvocationsYearAgo: number;
    tokensWeekAgo: number;
    tokensMonthAgo: number;
    tokensYearAgo: number;

    totalProjects: number;
    totalRuns: number;
    totalModelInvocations: number;
    totalTokens: number;

    monthlyRuns: string; // JSON string

    recentProjects: {
        name: string;
        lastUpdateTime: string;
        runCount: number;
    }[];
}

export interface ModelInvocationForm {
    id: string;
    runId: string;
    modelName: string;
    timestamp: string;
    arguments: object;
    response: object;
    modelType: string;
    configName: string;
    usage: Usage;
}

export interface TokenStats {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface ModelInvocationData {
    modelInvocations: number;
    chat: {
        modelInvocations: number;
        avgTokens: TokenStats;
        totalTokens: TokenStats;
        modelInvocationsByModel: Array<{
            modelName: string;
            invocations: number;
        }>;
        avgTokensByModel: Array<{
            modelName: string;
            promptTokens: number;
            completionTokens: number;
        }>;
        totalTokensByModel: Array<{
            modelName: string;
            promptTokens: number;
            completionTokens: number;
        }>;
    };
}

export interface BackendResponse {
    success: boolean;
    message: string;
    data?: unknown;
}

interface Metric {
    name: string;
    type: 'discrete';
    enum: (string | number)[];
}

export interface EvaluationMeta {
    id: string;
    benchmark: string;
    createdAt: string;
    time: string;
    repeat: number;
    dir: string;
}

export interface EvaluationResult {
    results: Record<string, Record<string, unknown>>;
}

export interface DiscreteMetricRes {
    name: string;
    type: 'category' | 'number';
    value: string | number;
    enum: (string | number)[];
    multipleOf?: number;
}

export interface ContinuousMetricRes {
    name: string;
    type: 'number';
    minimum?: number;
    maximum?: number;
    multipleOf?: number;
    exclusiveMinimum?: number;
    exclusiveMaximum?: number;
    description?: string;
}

export interface EvaluationMetaData {
    id: string;
    name: string;
    status: string;
    progress: number;
    createdAt: string;
    time: number;
    metrics: Metric[];
    repeat: number;
    report_dir: string;
}

export interface Task {
    id: string;
    question: string;
    ground_truth: string;
    repeat: string;
    status: Status;

    answers: string | null;
    result: Record<string, unknown>;
}

export interface EvaluationData {
    // Metadata
    id: string;
    name: string;
    status: string;
    benchmark: string;
    progress: number;
    createdAt: string;
    time: number;
    metrics: Metric[];
    repeat: number;
    report_dir: string;
    // Data
    results: Record<string, unknown>;
}

// TracePage trpc schemas
export const GetTraceListParamsSchema = z.object({
    serviceName: z.string().optional(),
    operationName: z.string().optional(),
    status: z.number().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
});
export type GetTraceListParams = z.infer<typeof GetTraceListParamsSchema>;

export const GetTraceParamsSchema = z.object({
    traceId: z.string(),
});
export type GetTraceParams = z.infer<typeof GetTraceParamsSchema>;

export const GetTraceStatisticParamsSchema = z.object({
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    serviceName: z.string().optional(),
    operationName: z.string().optional(),
});
export type GetTraceStatisticParams = z.infer<
    typeof GetTraceStatisticParamsSchema
>;
