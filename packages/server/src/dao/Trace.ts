import { SpanAttributes, SpanData, SpanResource, SpanScope } from '../../../shared/src/types/trace';
import { ModelInvocationData } from '../../../shared/src/types/trpc';
import { getNestedValue } from '../../../shared/src/utils/objectUtils';
import { getTimeDifferenceNano } from '../../../shared/src/utils/timeUtils';
import { ModelInvocationView } from '../models/ModelInvocationView';
import { SpanTable } from '../models/Trace';

export class SpanDao {
    static async saveSpans(dataArray: SpanData[]): Promise<SpanTable[]> {
        try {
            // Create SpanTable instances with embedded resource and scope data
            const spans = dataArray.map((data) => {
                // Extract key fields for indexing
                const serviceName = this.extractServiceName(data.resource);
                const operationName = this.extractOperationName(data.attributes);
                const instrumentationName = this.extractInstrumentationName(data.scope);
                const instrumentationVersion = this.extractInstrumentationVersion(data.scope);
                const model = this.extractModel(data.attributes);
                const inputTokens = this.extractInputTokens(data.attributes);
                const outputTokens = this.extractOutputTokens(data.attributes);

                const runId = this.extractRunId(data.attributes);
                const latencyNs = getTimeDifferenceNano(data.startTimeUnixNano, data.endTimeUnixNano);
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
                    // Embed resource and scope data
                    resource: data.resource,
                    scope: data.scope,
                    // Extract key fields for indexing
                    serviceName,
                    operationName,
                    instrumentationName,
                    instrumentationVersion,
                    model,
                    inputTokens,
                    outputTokens,
                    runId: runId,
                    latencyNs: latencyNs,
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


    static async getSpansByRunId(runId: string): Promise<SpanData[]> {
        try {
            const spans = await SpanTable.find({
                where: { runId },
                order: { startTimeUnixNano: 'ASC' }, // 按开始时间排序，便于构建树形结构
            });

            return spans.map((span) => ({
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
                droppedAttributesCount: span.droppedAttributesCount || 0,
                events: (span.events || []) as any[],
                droppedEventsCount: span.droppedEventsCount || 0,
                links: (span.links || []) as any[],
                droppedLinksCount: span.droppedLinksCount || 0,
                status: span.status as any, // SpanStatus from OpenTelemetry API
                resource: span.resource as any,
                scope: span.scope as any,
                // 注意：SpanData 接口中没有 runId 和 latencyNs 字段
                // 这些字段在 SpanTable 中存在，但不在 SpanData 接口中
                runId: span.runId,
                latencyNs: span.latencyNs,
            }) as SpanData);
        } catch (error) {
            console.error(`Error fetching spans for runId ${runId}:`, error);
            throw error;
        }
    }

    // Helper methods to extract key fields from nested data
    private static extractServiceName(resource: SpanResource): string | undefined {
        return getNestedValue(resource.attributes, 'service.name');
    }

    private static extractRunId(attributes: Record<string, unknown>): string | undefined {
        return getNestedValue(attributes, 'gen_ai.conversation.id');
    }

    private static extractOperationName(attributes: Record<string, unknown>): string | undefined {
        return getNestedValue(attributes, 'gen_ai.operation.name');
    }

    private static extractInstrumentationName(scope: SpanScope): string | undefined {
        return getNestedValue(scope.attributes, 'server.name');
    }

    private static extractInstrumentationVersion(scope: SpanScope): string | undefined {
        return getNestedValue(scope.attributes, 'server.version');
    }

    private static extractModel(attributes: Record<string, unknown>): string | undefined {
        return getNestedValue(attributes, 'gen_ai.request.model');
    }

    private static extractInputTokens(attributes: Record<string, unknown>): number | undefined {
        return getNestedValue(attributes, 'gen_ai.usage.input_tokens');
    }

    private static extractOutputTokens(attributes: Record<string, unknown>): number | undefined {
        return getNestedValue(attributes, 'gen_ai.usage.output_tokens');
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
        status?: string;
        startTime?: string;
        endTime?: string;
        limit?: number;
    }): Promise<SpanTable[]> {
        const queryBuilder = SpanTable.createQueryBuilder('span');

        if (filters.serviceName) {
            queryBuilder.andWhere('span.serviceName = :serviceName', { serviceName: filters.serviceName });
        }

        if (filters.operationName) {
            queryBuilder.andWhere('span.operationName = :operationName', { operationName: filters.operationName });
        }

        if (filters.instrumentationName) {
            queryBuilder.andWhere('span.instrumentationName = :instrumentationName', { instrumentationName: filters.instrumentationName });
        }

        if (filters.model) {
            queryBuilder.andWhere('span.model = :model', { model: filters.model });
        }

        if (filters.status) {
            queryBuilder.andWhere('span.status = :status', { status: filters.status });
        }

        if (filters.startTime) {
            queryBuilder.andWhere('span.startTimeUnixNano >= :startTime', { startTime: filters.startTime });
        }

        if (filters.endTime) {
            queryBuilder.andWhere('span.startTimeUnixNano <= :endTime', { endTime: filters.endTime });
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

    static async getModelInvocationData(runId: string) {
        // 1. 基础统计
        const basicStats = await SpanTable.createQueryBuilder('span')
            .select(
                `COUNT(CASE
                    WHEN (json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat'
                         OR json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat_model')
                    THEN 1
                END)`,
                'totalInvocations',
            )
            .addSelect(
                `COUNT(CASE
                    WHEN (json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat'
                         OR json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat_model')
                    AND json_extract(span.attributes, '$.gen_ai.usage') IS NOT NULL
                    THEN 1
                END)`,
                'chatInvocations',
            )
            .where('span.runId = :runId', { runId })
            .getRawOne();

        // 2. Chat类型的token统计（总计和平均值）
        const chatTokenStats = await SpanTable.createQueryBuilder('span')
            .select([
                // 总计 - input tokens
                `COALESCE(SUM(
                    CASE WHEN (json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat'
                             OR json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat_model')
                         AND json_extract(span.attributes, '$.gen_ai.usage') IS NOT NULL
                    THEN CAST(json_extract(span.attributes, '$.gen_ai.usage.input_tokens') AS INTEGER)
                    ELSE 0 END
                ), 0) as totalPromptTokens`,
                // 总计 - output tokens
                `COALESCE(SUM(
                    CASE WHEN (json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat'
                             OR json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat_model')
                         AND json_extract(span.attributes, '$.gen_ai.usage') IS NOT NULL
                    THEN CAST(json_extract(span.attributes, '$.gen_ai.usage.output_tokens') AS INTEGER)
                    ELSE 0 END
                ), 0) as totalCompletionTokens`,
                // 平均 - input tokens
                `COALESCE(
                    CAST(SUM(
                        CASE WHEN (json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat'
                                 OR json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat_model')
                             AND json_extract(span.attributes, '$.gen_ai.usage') IS NOT NULL
                        THEN CAST(json_extract(span.attributes, '$.gen_ai.usage.input_tokens') AS INTEGER)
                        ELSE 0 END
                    ) AS FLOAT) /
                    NULLIF(COUNT(CASE WHEN (json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat'
                                         OR json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat_model')
                                     AND json_extract(span.attributes, '$.gen_ai.usage') IS NOT NULL THEN 1 END), 0)
                , 0) as avgPromptTokens`,
                // 平均 - output tokens
                `COALESCE(
                    CAST(SUM(
                        CASE WHEN (json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat'
                                 OR json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat_model')
                             AND json_extract(span.attributes, '$.gen_ai.usage') IS NOT NULL
                        THEN CAST(json_extract(span.attributes, '$.gen_ai.usage.output_tokens') AS INTEGER)
                        ELSE 0 END
                    ) AS FLOAT) /
                    NULLIF(COUNT(CASE WHEN (json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat'
                                         OR json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat_model')
                                     AND json_extract(span.attributes, '$.gen_ai.usage') IS NOT NULL THEN 1 END), 0)
                , 0) as avgCompletionTokens`,
            ])
            .where('span.runId = :runId', { runId })
            .getRawOne();

        // 3. 按模型分组的调用次数
        const modelInvocations = await SpanTable.createQueryBuilder('span')
            .select([
                "json_extract(span.attributes, '$.gen_ai.request.model') as modelName",
                'COUNT(*) as invocations',
            ])
            .where('span.runId = :runId', { runId })
            .andWhere(
                "(json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat' OR json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat_model')",
            )
            .andWhere(
                "json_extract(span.attributes, '$.gen_ai.usage') IS NOT NULL",
            )
            .groupBy('modelName')
            .getRawMany();

        // 4. 按模型分组的token统计
        const modelTokenStats = await SpanTable.createQueryBuilder('span')
            .select([
                "json_extract(span.attributes, '$.gen_ai.request.model') as modelName",
                // 总计
                `SUM(CAST(json_extract(span.attributes, '$.gen_ai.usage.input_tokens') AS INTEGER)) as totalPromptTokens`,
                `SUM(CAST(json_extract(span.attributes, '$.gen_ai.usage.output_tokens') AS INTEGER)) as totalCompletionTokens`,
                // 平均值
                `CAST(SUM(CAST(json_extract(span.attributes, '$.gen_ai.usage.input_tokens') AS INTEGER)) AS FLOAT) / COUNT(*) as avgPromptTokens`,
                `CAST(SUM(CAST(json_extract(span.attributes, '$.gen_ai.usage.output_tokens') AS INTEGER)) AS FLOAT) / COUNT(*) as avgCompletionTokens`,
            ])
            .where('span.runId = :runId', { runId })
            .andWhere(
                "(json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat' OR json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat_model')",
            )
            .andWhere(
                "json_extract(span.attributes, '$.gen_ai.usage') IS NOT NULL",
            )
            .groupBy('modelName')
            .getRawMany();

        // 5. 构建返回结构
        return {
            modelInvocations: Number(basicStats.totalInvocations),
            chat: {
                modelInvocations: Number(basicStats.chatInvocations),

                totalTokens: {
                    promptTokens: Number(chatTokenStats.totalPromptTokens),
                    completionTokens: Number(
                        chatTokenStats.totalCompletionTokens,
                    ),
                    totalTokens:
                        Number(chatTokenStats.totalPromptTokens) +
                        Number(chatTokenStats.totalCompletionTokens),
                },

                avgTokens: {
                    promptTokens: Number(chatTokenStats.avgPromptTokens),
                    completionTokens: Number(
                        chatTokenStats.avgCompletionTokens,
                    ),
                    totalTokens:
                        Number(chatTokenStats.avgPromptTokens) +
                        Number(chatTokenStats.avgCompletionTokens),
                },

                modelInvocationsByModel: modelInvocations.map((stat) => ({
                    modelName: stat.modelName || 'unknown',
                    invocations: Number(stat.invocations),
                })),

                totalTokensByModel: modelTokenStats.map((stat) => ({
                    modelName: stat.modelName || 'unknown',
                    promptTokens: Number(stat.totalPromptTokens),
                    completionTokens: Number(stat.totalCompletionTokens),
                    totalTokens:
                        Number(stat.totalPromptTokens) +
                        Number(stat.totalCompletionTokens),
                })),

                avgTokensByModel: modelTokenStats.map((stat) => ({
                    modelName: stat.modelName || 'unknown',
                    promptTokens: Number(stat.avgPromptTokens),
                    completionTokens: Number(stat.avgCompletionTokens),
                    totalTokens:
                        Number(stat.avgPromptTokens) +
                        Number(stat.avgCompletionTokens),
                })),
            },
        } as ModelInvocationData;
    }
}
