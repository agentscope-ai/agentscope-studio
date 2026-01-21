import { z } from 'zod';
import { ContentBlocks, ContentType, Status } from './messageForm';
import { Usage } from './usage';

/**
 * Filter operators for table filtering
 */

// Numeric filter operators
export enum NumericFilterOperator {
    EQUALS = 'eq',
    NOT_EQUALS = 'ne',
    GREATER_THAN = 'gt',
    GREATER_THAN_OR_EQUAL = 'gte',
    LESS_THAN = 'lt',
    LESS_THAN_OR_EQUAL = 'lte',
}

// Range filter operators
export enum RangeFilterOperator {
    BETWEEN = 'between',
    NOT_BETWEEN = 'notBetween',
}

// String filter operators
export enum StringFilterOperator {
    CONTAINS = 'contains',
    NOT_CONTAINS = 'notContains',
}

// Array filter operators
export enum ArrayFilterOperator {
    // Check if a value is in an array of possible values
    // e.g., status IN ['active', 'pending'] - checks if status value is one of ['active', 'pending']
    IN = 'in',
    NOT_IN = 'notIn',
}

export enum ArrayElementContainsFilterOperator {
    // Check if any element in array contains a substring
    // e.g., tags ARRAY_ELEMENT_CONTAINS 'ab' - checks if any element in ['abc', 'def'] contains 'ab'
    // any(element.includes(value) for element in array)
    ARRAY_ELEMENT_CONTAINS = 'arrayElementContains',
    ARRAY_ELEMENT_NOT_CONTAINS = 'arrayElementNotContains',
}

// Define filter value schemas for different operator types
const NumericFilterSchema = z.object({
    operator: z.nativeEnum(NumericFilterOperator),
    value: z.number(),
});

const RangeFilterSchema = z.object({
    operator: z.nativeEnum(RangeFilterOperator),
    value: z.tuple([z.number(), z.number()]),
});

// String range filter for timestamp comparisons (BigInt as string)
const StringRangeFilterSchema = z.object({
    operator: z.nativeEnum(RangeFilterOperator),
    value: z.tuple([z.string(), z.string()]),
});

const StringFilterSchema = z.object({
    operator: z.nativeEnum(StringFilterOperator),
    value: z.string(),
});

const ArrayFilterSchema = z.object({
    operator: z.nativeEnum(ArrayFilterOperator),
    value: z.array(z.unknown()),
});

const ArrayElementContainsFilterSchema = z.object({
    operator: z.nativeEnum(ArrayElementContainsFilterOperator),
    value: z.string(), // Substring to search for in array elements
});

const BasicTableParamsSchema = {
    pagination: z.object({
        page: z.number().int().min(1),
        pageSize: z.number().int().min(10),
    }),
    sort: z
        .object({
            field: z.string(),
            order: z.enum(['asc', 'desc']),
        })
        .optional(),
    filters: z
        .record(
            z.union([
                NumericFilterSchema,
                RangeFilterSchema,
                StringRangeFilterSchema,
                StringFilterSchema,
                ArrayFilterSchema,
                ArrayElementContainsFilterSchema,
            ]),
        )
        .optional(),
};

export const RegisterReplyParamsSchema = z.object({
    runId: z.string(),
    replyId: z.string(),
    replyRole: z.string(),
    replyName: z.string(),
    createdAt: z.string(),
});
export type RegisterReplyParams = z.infer<typeof RegisterReplyParamsSchema>;

/**
 * Zod schema for table request parameters.
 * This schema validates the structure of the request parameters used for table-related operations.
 */
export const TableRequestParamsSchema = z.object(BasicTableParamsSchema);
export type TableRequestParams = z.infer<typeof TableRequestParamsSchema>;

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
    [key: string]: unknown;
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

export interface ResponseBody<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
}

export interface TableData<T> {
    list: T[];
    total: number;
    page: number;
    pageSize: number;
}

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
