import { SpanStatus } from '@opentelemetry/api';
import {
    SpanAttributes,
    SpanData,
    SpanEvent,
    SpanLink,
    SpanResource,
    SpanScope,
} from '../../../shared/src/types/trace';
import { ModelInvocationData } from '../../../shared/src/types/trpc';
import { getNestedValue } from '../../../shared/src/utils/objectUtils';
import { ModelInvocationView } from '../models/ModelInvocationView';
import { SpanTable } from '../models/Trace';

export class SpanDao {
    static async saveSpans(dataArray: SpanData[]): Promise<SpanTable[]> {
        try {
            // Create SpanTable instances with embedded resource and scope data
            const spans = dataArray.map((data) => {
                // Extract key fields for indexing
                const serviceName = this.extractServiceName(data.resource);
                const operationName = this.extractOperationName(
                    data.attributes,
                );
                const instrumentationName = this.extractInstrumentationName(
                    data.scope,
                );
                const instrumentationVersion =
                    this.extractInstrumentationVersion(data.scope);
                const model = this.extractModel(data.attributes);
                const inputTokens = this.extractInputTokens(data.attributes);
                const outputTokens = this.extractOutputTokens(data.attributes);
                const totalTokens = this.calculateTotalTokens(
                    inputTokens,
                    outputTokens,
                );
                const statusCode = data.status.code || 0;

                const span = new SpanTable();
                Object.assign(span, {
                    id: data.spanId, // Use spanId as the primary key
                    traceId: data.traceId,
                    spanId: data.spanId,
                    traceState: data.traceState,
                    parentSpanId: data.parentSpanId,
                    flags: data.flags,
                    name: data.name,
                    kind: data.kind, // Now it's a number (OpenTelemetry API enum)
                    startTimeUnixNano: data.startTimeUnixNano,
                    endTimeUnixNano: data.endTimeUnixNano,
                    attributes: data.attributes,
                    droppedAttributesCount: data.droppedAttributesCount,
                    events: data.events,
                    droppedEventsCount: data.droppedEventsCount,
                    links: data.links,
                    droppedLinksCount: data.droppedLinksCount,
                    status: data.status,
                    resource: data.resource,
                    scope: data.scope,

                    // Additional fields for our application
                    statusCode: statusCode,
                    serviceName: serviceName,
                    operationName: operationName,
                    instrumentationName: instrumentationName,
                    instrumentationVersion: instrumentationVersion,
                    model: model,
                    inputTokens: inputTokens,
                    outputTokens: outputTokens,
                    totalTokens: totalTokens,
                    conversationId: data.conversationId,
                    latencyNs: data.latencyNs,
                });
                return span;
            });

            // Save all spans in a single transaction
            return await SpanTable.save(spans);
        } catch (error) {
            console.error('Error saving spans:', error);
            throw error;
        }
    }

    static async getSpansByConversationId(
        conversationId: string,
    ): Promise<SpanData[]> {
        try {
            const spans = await SpanTable.find({
                where: { conversationId },
                order: { startTimeUnixNano: 'ASC' },
            });

            return spans.map(
                (span) =>
                    ({
                        traceId: span.traceId,
                        spanId: span.spanId,
                        traceState: span.traceState,
                        parentSpanId: span.parentSpanId,
                        flags: span.flags,
                        name: span.name,
                        kind: span.kind,
                        startTimeUnixNano: span.startTimeUnixNano,
                        endTimeUnixNano: span.endTimeUnixNano,
                        attributes: span.attributes as SpanAttributes,
                        droppedAttributesCount:
                            span.droppedAttributesCount || 0,
                        events: (span.events || []) as unknown as SpanEvent[],
                        droppedEventsCount: span.droppedEventsCount || 0,
                        links: (span.links || []) as unknown as SpanLink[],
                        droppedLinksCount: span.droppedLinksCount || 0,
                        status: span.status as unknown as SpanStatus,
                        resource: span.resource as unknown as SpanResource,
                        scope: span.scope as unknown as SpanScope,
                        conversationId: span.conversationId,
                        latencyNs: span.latencyNs,
                    }) as SpanData,
            );
        } catch (error) {
            console.error(
                `Error fetching spans for conversationId ${conversationId}:`,
                error,
            );
            throw error;
        }
    }

    // Helper methods to extract key fields from nested data
    private static calculateTotalTokens(
        inputTokens: number | undefined,
        outputTokens: number | undefined,
    ): number | undefined {
        if (
            typeof inputTokens === 'number' &&
            typeof outputTokens === 'number'
        ) {
            return inputTokens + outputTokens;
        }
        if (typeof inputTokens === 'number') {
            return inputTokens;
        }
        if (typeof outputTokens === 'number') {
            return outputTokens;
        }
        return undefined;
    }

    private static extractServiceName(
        resource: SpanResource,
    ): string | undefined {
        const value = getNestedValue(resource.attributes, 'service.name');
        return typeof value === 'string' ? value : undefined;
    }

    private static extractOperationName(
        attributes: Record<string, unknown>,
    ): string | undefined {
        const value = getNestedValue(attributes, 'gen_ai.operation.name');
        return typeof value === 'string' ? value : undefined;
    }

    private static extractInstrumentationName(
        scope: SpanScope,
    ): string | undefined {
        const value = getNestedValue(scope.attributes, 'server.name');
        return typeof value === 'string' ? value : undefined;
    }

    private static extractInstrumentationVersion(
        scope: SpanScope,
    ): string | undefined {
        const value = getNestedValue(scope.attributes, 'server.version');
        return typeof value === 'string' ? value : undefined;
    }

    private static extractModel(
        attributes: Record<string, unknown>,
    ): string | undefined {
        const value = getNestedValue(attributes, 'gen_ai.request.model');
        return typeof value === 'string' ? value : undefined;
    }

    private static extractInputTokens(
        attributes: Record<string, unknown>,
    ): number | undefined {
        const value = getNestedValue(attributes, 'gen_ai.usage.input_tokens');
        return typeof value === 'number' ? value : undefined;
    }

    private static extractOutputTokens(
        attributes: Record<string, unknown>,
    ): number | undefined {
        const value = getNestedValue(attributes, 'gen_ai.usage.output_tokens');
        return typeof value === 'number' ? value : undefined;
    }

    // Trace listing and filtering methods
    static async getLatestTraces(limit: number = 10): Promise<SpanTable[]> {
        return await SpanTable.find({
            order: { startTimeUnixNano: 'DESC' },
            take: limit,
        });
    }

    static async getTracesByTraceId(traceId: string): Promise<SpanTable[]> {
        return await SpanTable.find({
            where: { traceId },
            order: { startTimeUnixNano: 'ASC' },
        });
    }

    static async getSpanById(spanId: string): Promise<SpanTable | null> {
        return await SpanTable.findOne({
            where: { spanId },
        });
    }

    static async searchTraces(filters: {
        serviceName?: string;
        operationName?: string;
        instrumentationName?: string;
        model?: string;
        status?: number; // Status code: 0=UNSET, 1=OK, 2=ERROR
        startTime?: string;
        endTime?: string;
        limit?: number;
    }): Promise<SpanTable[]> {
        const queryBuilder = SpanTable.createQueryBuilder('span');

        if (filters.serviceName) {
            queryBuilder.andWhere('span.serviceName = :serviceName', {
                serviceName: filters.serviceName,
            });
        }

        if (filters.operationName) {
            queryBuilder.andWhere('span.operationName = :operationName', {
                operationName: filters.operationName,
            });
        }

        if (filters.instrumentationName) {
            queryBuilder.andWhere(
                'span.instrumentationName = :instrumentationName',
                { instrumentationName: filters.instrumentationName },
            );
        }

        if (filters.model) {
            queryBuilder.andWhere('span.model = :model', {
                model: filters.model,
            });
        }

        if (filters.status !== undefined) {
            queryBuilder.andWhere('span.statusCode = :statusCode', {
                statusCode: filters.status,
            });
        }

        if (filters.startTime) {
            queryBuilder.andWhere('span.startTimeUnixNano >= :startTime', {
                startTime: filters.startTime,
            });
        }

        if (filters.endTime) {
            queryBuilder.andWhere('span.startTimeUnixNano <= :endTime', {
                endTime: filters.endTime,
            });
        }

        queryBuilder.orderBy('span.startTimeUnixNano', 'DESC');

        if (filters.limit) {
            queryBuilder.limit(filters.limit);
        }

        return await queryBuilder.getMany();
    }

    static async getModelInvocationViewData() {
        const res = await ModelInvocationView.find();
        if (res.length > 0) {
            return res[0];
        } else {
            throw new Error('ModelInvocationView data not found');
        }
    }

    static async getModelInvocationData(conversationId: string) {
        // 1. Basic statistics
        const basicStats = await SpanTable.createQueryBuilder('span')
            .select(
                `COUNT(CASE
                    WHEN (span.operationName = 'chat'
                         OR span.operationName = 'chat_model')
                    THEN 1
                END)`,
                'totalInvocations',
            )
            .addSelect(
                `COUNT(CASE
                    WHEN (span.operationName = 'chat'
                         OR span.operationName = 'chat_model')
                    AND span.totalTokens IS NOT NULL
                    THEN 1
                END)`,
                'chatInvocations',
            )
            .where('span.conversationId = :conversationId', { conversationId })
            .getRawOne();

        // 2. Chat token statistics (total and average)
        const chatTokenStats = await SpanTable.createQueryBuilder('span')
            .select([
                // Total - input tokens
                `COALESCE(SUM(
                    CASE WHEN (span.operationName = 'chat'
                             OR span.operationName = 'chat_model')
                         AND span.totalTokens IS NOT NULL
                    THEN CAST(COALESCE(span.inputTokens, 0) AS INTEGER)
                    ELSE 0 END
                ), 0) as totalPromptTokens`,
                // Total - output tokens
                `COALESCE(SUM(
                    CASE WHEN (span.operationName = 'chat'
                             OR span.operationName = 'chat_model')
                         AND span.totalTokens IS NOT NULL
                    THEN CAST(COALESCE(span.outputTokens, 0) AS INTEGER)
                    ELSE 0 END
                ), 0) as totalCompletionTokens`,
                // Total - total tokens
                `COALESCE(SUM(
                    CASE WHEN (span.operationName = 'chat'
                             OR span.operationName = 'chat_model')
                         AND span.totalTokens IS NOT NULL
                    THEN CAST(COALESCE(span.totalTokens, 0) AS INTEGER)
                    ELSE 0 END
                ), 0) as totalTokens`,
                // Average - input tokens
                `COALESCE(
                    CAST(SUM(
                        CASE WHEN (span.operationName = 'chat'
                                 OR span.operationName = 'chat_model')
                             AND span.totalTokens IS NOT NULL
                        THEN CAST(COALESCE(span.inputTokens, 0) AS INTEGER)
                        ELSE 0 END
                    ) AS FLOAT) /
                    NULLIF(COUNT(CASE WHEN (span.operationName = 'chat'
                                         OR span.operationName = 'chat_model')
                                     AND span.totalTokens IS NOT NULL THEN 1 END), 0)
                , 0) as avgPromptTokens`,
                // Average - output tokens
                `COALESCE(
                    CAST(SUM(
                        CASE WHEN (span.operationName = 'chat'
                                 OR span.operationName = 'chat_model')
                             AND span.totalTokens IS NOT NULL
                        THEN CAST(COALESCE(span.outputTokens, 0) AS INTEGER)
                        ELSE 0 END
                    ) AS FLOAT) /
                    NULLIF(COUNT(CASE WHEN (span.operationName = 'chat'
                                         OR span.operationName = 'chat_model')
                                     AND span.totalTokens IS NOT NULL THEN 1 END), 0)
                , 0) as avgCompletionTokens`,
                // Average - total tokens
                `COALESCE(
                    CAST(SUM(
                        CASE WHEN (span.operationName = 'chat'
                                 OR span.operationName = 'chat_model')
                             AND span.totalTokens IS NOT NULL
                        THEN CAST(COALESCE(span.totalTokens, 0) AS INTEGER)
                        ELSE 0 END
                    ) AS FLOAT) /
                    NULLIF(COUNT(CASE WHEN (span.operationName = 'chat'
                                         OR span.operationName = 'chat_model')
                                     AND span.totalTokens IS NOT NULL THEN 1 END), 0)
                , 0) as avgTotalTokens`,
            ])
            .where('span.conversationId = :conversationId', { conversationId })
            .getRawOne();

        // 3. Model invocation statistics (grouped by model)
        const modelInvocations = await SpanTable.createQueryBuilder('span')
            .select(['span.model as modelName', 'COUNT(*) as invocations'])
            .where('span.conversationId = :conversationId', { conversationId })
            .andWhere(
                "(span.operationName = 'chat' OR span.operationName = 'chat_model')",
            )
            .andWhere('span.totalTokens IS NOT NULL')
            .groupBy('modelName')
            .getRawMany();

        // 4. Model token statistics (grouped by model)
        const modelTokenStats = await SpanTable.createQueryBuilder('span')
            .select([
                'span.model as modelName',
                // Total
                `SUM(CAST(COALESCE(span.inputTokens, 0) AS INTEGER)) as totalPromptTokens`,
                `SUM(CAST(COALESCE(span.outputTokens, 0) AS INTEGER)) as totalCompletionTokens`,
                `SUM(CAST(COALESCE(span.totalTokens, 0) AS INTEGER)) as totalTokens`,
                // Average
                `CAST(SUM(CAST(COALESCE(span.inputTokens, 0) AS INTEGER)) AS FLOAT) / COUNT(*) as avgPromptTokens`,
                `CAST(SUM(CAST(COALESCE(span.outputTokens, 0) AS INTEGER)) AS FLOAT) / COUNT(*) as avgCompletionTokens`,
                `CAST(SUM(CAST(COALESCE(span.totalTokens, 0) AS INTEGER)) AS FLOAT) / COUNT(*) as avgTotalTokens`,
            ])
            .where('span.conversationId = :conversationId', { conversationId })
            .andWhere(
                "(span.operationName = 'chat' OR span.operationName = 'chat_model')",
            )
            .andWhere('span.totalTokens IS NOT NULL')
            .groupBy('modelName')
            .getRawMany();

        // 5. Build return structure
        return {
            modelInvocations: Number(basicStats.totalInvocations),
            chat: {
                modelInvocations: Number(basicStats.chatInvocations),

                totalTokens: {
                    promptTokens: Number(chatTokenStats.totalPromptTokens),
                    completionTokens: Number(
                        chatTokenStats.totalCompletionTokens,
                    ),
                    totalTokens: Number(chatTokenStats.totalTokens),
                },

                avgTokens: {
                    promptTokens: Number(chatTokenStats.avgPromptTokens),
                    completionTokens: Number(
                        chatTokenStats.avgCompletionTokens,
                    ),
                    totalTokens: Number(chatTokenStats.avgTotalTokens),
                },

                modelInvocationsByModel: modelInvocations.map((stat) => ({
                    modelName: stat.modelName || 'unknown',
                    invocations: Number(stat.invocations),
                })),

                totalTokensByModel: modelTokenStats.map((stat) => ({
                    modelName: stat.modelName || 'unknown',
                    promptTokens: Number(stat.totalPromptTokens),
                    completionTokens: Number(stat.totalCompletionTokens),
                    totalTokens: Number(stat.totalTokens),
                })),

                avgTokensByModel: modelTokenStats.map((stat) => ({
                    modelName: stat.modelName || 'unknown',
                    promptTokens: Number(stat.avgPromptTokens),
                    completionTokens: Number(stat.avgCompletionTokens),
                    totalTokens: Number(stat.avgTotalTokens),
                })),
            },
        } as ModelInvocationData;
    }

    static async deleteSpansByConversationIds(
        conversationIds: string[],
    ): Promise<number> {
        try {
            if (conversationIds.length === 0) {
                return 0;
            }
            const result = await SpanTable.createQueryBuilder()
                .delete()
                .where('conversationId IN (:...conversationIds)', {
                    conversationIds,
                })
                .execute();
            return result.affected || 0;
        } catch (error) {
            console.error('Error deleting spans by conversationIds:', error);
            throw error;
        }
    }

    // Get unique trace IDs with aggregated information
    static async getTraceList(filters: {
        serviceName?: string;
        operationName?: string;
        status?: number;
        startTime?: string;
        endTime?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        traces: Array<{
            traceId: string;
            name: string;
            startTime: string;
            endTime: string;
            duration: number; // in seconds
            status: number;
            spanCount: number;
            totalTokens?: number;
        }>;
        total: number;
    }> {
        try {
            const queryBuilder = SpanTable.createQueryBuilder('span')
                .select('span.traceId', 'traceId')
                .addSelect('MIN(span.startTimeUnixNano)', 'startTime')
                .addSelect('MAX(span.endTimeUnixNano)', 'endTime')
                .addSelect('MIN(span.name)', 'name')
                .addSelect('MAX(span.statusCode)', 'status')
                .addSelect('COUNT(span.id)', 'spanCount')
                .addSelect('SUM(COALESCE(span.totalTokens, 0))', 'totalTokens')
                .groupBy('span.traceId');

            if (filters.serviceName) {
                queryBuilder.andWhere('span.serviceName = :serviceName', {
                    serviceName: filters.serviceName,
                });
            }

            if (filters.operationName) {
                queryBuilder.andWhere('span.operationName = :operationName', {
                    operationName: filters.operationName,
                });
            }

            if (filters.status !== undefined) {
                queryBuilder.andWhere('span.statusCode = :statusCode', {
                    statusCode: filters.status,
                });
            }

            if (filters.startTime) {
                queryBuilder.andWhere('span.startTimeUnixNano >= :startTime', {
                    startTime: filters.startTime,
                });
            }

            if (filters.endTime) {
                queryBuilder.andWhere('span.startTimeUnixNano <= :endTime', {
                    endTime: filters.endTime,
                });
            }

            // Get total count (before pagination)
            const countQuery = queryBuilder.clone();
            const totalResult = await countQuery.getRawMany();
            const total = totalResult.length;

            // Apply ordering and pagination
            // Use the aggregate expression directly for ordering
            queryBuilder.orderBy('MIN(span.startTimeUnixNano)', 'DESC');

            if (filters.limit) {
                queryBuilder.limit(filters.limit);
            }

            if (filters.offset) {
                queryBuilder.offset(filters.offset);
            }

            const results = await queryBuilder.getRawMany();

            console.debug(
                `[TraceDao] getTraceList: found ${total} traces, returning ${results.length} with limit=${filters.limit}, offset=${filters.offset}`,
            );

            // Get root spans for each trace to extract input/output
            interface TraceListRow {
                traceId: string;
                startTime: string;
                endTime: string;
                name: string;
                status: number | string;
                spanCount: number | string;
                totalTokens: number | string | null;
            }
            const traceIds = results.map((row: TraceListRow) => row.traceId);

            // Get root spans (spans with no parent or empty parent) for the traces in results
            const rootSpans =
                traceIds.length > 0
                    ? await SpanTable.createQueryBuilder('span')
                          .where('span.traceId IN (:...traceIds)', { traceIds })
                          .andWhere(
                              '(span.parentSpanId IS NULL OR span.parentSpanId = :emptyString)',
                              { emptyString: '' },
                          )
                          .select(['span.traceId', 'span.name'])
                          .getMany()
                    : [];

            const rootSpanMap = new Map(
                rootSpans.map((span) => [span.traceId, span]),
            );

            const traces = results.map((row: TraceListRow) => {
                try {
                    const startTimeNs = BigInt(row.startTime || '0');
                    const endTimeNs = BigInt(row.endTime || '0');
                    const duration = Number(endTimeNs - startTimeNs) / 1e9; // Convert nanoseconds to seconds

                    const rootSpan = rootSpanMap.get(row.traceId);

                    return {
                        traceId: row.traceId || '',
                        name: rootSpan?.name || row.name || 'Unknown',
                        startTime: row.startTime || '0',
                        endTime: row.endTime || '0',
                        duration,
                        status: Number(row.status) || 0,
                        spanCount: Number(row.spanCount) || 0,
                        totalTokens:
                            row.totalTokens !== null &&
                            row.totalTokens !== undefined
                                ? Number(row.totalTokens)
                                : undefined,
                    };
                } catch (err) {
                    console.error('Error processing trace row:', row, err);
                    throw err;
                }
            });

            console.debug(
                `[TraceDao] getTraceList: returning ${traces.length} traces`,
            );
            return { traces, total };
        } catch (error) {
            console.error('Error getting trace list:', error);
            throw error;
        }
    }

    // Get a single trace with all spans
    static async getTrace(traceId: string): Promise<{
        traceId: string;
        spans: SpanData[];
        startTime: string;
        endTime: string;
        duration: number;
        status: number;
        totalTokens?: number;
    }> {
        try {
            const spans = await this.getTracesByTraceId(traceId);

            if (spans.length === 0) {
                throw new Error(`Trace with id ${traceId} not found`);
            }

            // Calculate trace-level statistics
            const startTimes = spans.map((s) => BigInt(s.startTimeUnixNano));
            const endTimes = spans.map((s) => BigInt(s.endTimeUnixNano));
            const minStartTime = startTimes.reduce((a, b) => (a < b ? a : b));
            const maxEndTime = endTimes.reduce((a, b) => (a > b ? a : b));
            const duration = Number(maxEndTime - minStartTime) / 1e9;

            // Get status (ERROR if any span has error status)
            const status = spans.some((s) => s.statusCode === 2) ? 2 : 1;

            // Calculate total tokens
            const totalTokens = spans.reduce(
                (sum, s) => sum + (s.totalTokens || 0),
                0,
            );

            const spanDataArray = spans.map(
                (span) =>
                    ({
                        traceId: span.traceId,
                        spanId: span.spanId,
                        traceState: span.traceState,
                        parentSpanId: span.parentSpanId,
                        flags: span.flags,
                        name: span.name,
                        kind: span.kind,
                        startTimeUnixNano: span.startTimeUnixNano,
                        endTimeUnixNano: span.endTimeUnixNano,
                        attributes: span.attributes as SpanAttributes,
                        droppedAttributesCount:
                            span.droppedAttributesCount || 0,
                        events: (span.events || []) as unknown as SpanEvent[],
                        droppedEventsCount: span.droppedEventsCount || 0,
                        links: (span.links || []) as unknown as SpanLink[],
                        droppedLinksCount: span.droppedLinksCount || 0,
                        status: span.status as unknown as SpanStatus,
                        resource: span.resource as unknown as SpanResource,
                        scope: span.scope as unknown as SpanScope,
                        conversationId: span.conversationId,
                        latencyNs: span.latencyNs,
                    }) as SpanData,
            );

            return {
                traceId,
                spans: spanDataArray,
                startTime: minStartTime.toString(),
                endTime: maxEndTime.toString(),
                duration,
                status,
                totalTokens: totalTokens > 0 ? totalTokens : undefined,
            };
        } catch (error) {
            console.error(`Error getting trace ${traceId}:`, error);
            throw error;
        }
    }

    // Get trace statistics
    static async getTraceStatistic(filters?: {
        startTime?: string;
        endTime?: string;
        serviceName?: string;
        operationName?: string;
    }): Promise<{
        totalTraces: number;
        totalSpans: number;
        errorTraces: number;
        avgDuration: number;
        totalTokens: number;
        tracesByStatus: Array<{ status: number; count: number }>;
    }> {
        try {
            const queryBuilder = SpanTable.createQueryBuilder('span');

            if (filters?.serviceName) {
                queryBuilder.andWhere('span.serviceName = :serviceName', {
                    serviceName: filters.serviceName,
                });
            }

            if (filters?.operationName) {
                queryBuilder.andWhere('span.operationName = :operationName', {
                    operationName: filters.operationName,
                });
            }

            if (filters?.startTime) {
                queryBuilder.andWhere('span.startTimeUnixNano >= :startTime', {
                    startTime: filters.startTime,
                });
            }

            if (filters?.endTime) {
                queryBuilder.andWhere('span.startTimeUnixNano <= :endTime', {
                    endTime: filters.endTime,
                });
            }

            // Get total spans
            const totalSpans = await queryBuilder.getCount();

            // Get unique trace count
            const uniqueTracesQuery = queryBuilder
                .clone()
                .select('COUNT(DISTINCT span.traceId)', 'count')
                .getRawOne();
            const totalTraces = Number((await uniqueTracesQuery).count || 0);

            // Get error traces count
            const errorTracesQuery = queryBuilder
                .clone()
                .select('COUNT(DISTINCT span.traceId)', 'count')
                .andWhere('span.statusCode = :statusCode', { statusCode: 2 })
                .getRawOne();
            const errorTraces = Number((await errorTracesQuery).count || 0);

            // Get average duration
            const durationQuery = await queryBuilder
                .clone()
                .select('span.traceId', 'traceId')
                .addSelect('MIN(span.startTimeUnixNano)', 'startTime')
                .addSelect('MAX(span.endTimeUnixNano)', 'endTime')
                .groupBy('span.traceId')
                .getRawMany();

            const durations = durationQuery.map(
                (row: { startTime: string; endTime: string }) => {
                    const startTimeNs = BigInt(row.startTime);
                    const endTimeNs = BigInt(row.endTime);
                    return Number(endTimeNs - startTimeNs) / 1e9;
                },
            );

            const avgDuration =
                durations.length > 0
                    ? durations.reduce((a: number, b: number) => a + b, 0) /
                      durations.length
                    : 0;

            // Get total tokens
            const tokensQuery = queryBuilder
                .clone()
                .select('SUM(COALESCE(span.totalTokens, 0))', 'total')
                .getRawOne();
            const totalTokens = Number((await tokensQuery).total || 0);

            // Get traces by status
            const statusQuery = await queryBuilder
                .clone()
                .select('span.statusCode', 'status')
                .addSelect('COUNT(DISTINCT span.traceId)', 'count')
                .groupBy('span.statusCode')
                .getRawMany();

            const tracesByStatus = statusQuery.map(
                (row: { status: number | string; count: number | string }) => ({
                    status: Number(row.status) || 0,
                    count: Number(row.count) || 0,
                }),
            );

            return {
                totalTraces,
                totalSpans,
                errorTraces,
                avgDuration,
                totalTokens,
                tracesByStatus,
            };
        } catch (error) {
            console.error('Error getting trace statistics:', error);
            throw error;
        }
    }
}
