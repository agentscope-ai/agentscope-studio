import { BaseEntity, DataSource, ViewColumn, ViewEntity } from 'typeorm';
import { SpanTable } from './Trace';

@ViewEntity({
    expression: (dataSource: DataSource) =>
        dataSource
            .createQueryBuilder()
            .from(SpanTable, 'span')
            .select(
                `COUNT(CASE
                    WHEN (json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat'
                         OR json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat_model')
                    THEN 1
                END)`,
                'totalModelInvocations',
            )
            .addSelect(
                `COALESCE(SUM(CASE
            WHEN json_extract(span.attributes, '$.gen_ai.usage') IS NOT NULL
            AND (json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat'
                 OR json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat_model')
            THEN (
                CAST(COALESCE(json_extract(span.attributes, '$.gen_ai.usage.input_tokens'), 0) AS INTEGER) +
                CAST(COALESCE(json_extract(span.attributes, '$.gen_ai.usage.output_tokens'), 0) AS INTEGER)
            )
            ELSE 0
        END), 0)`,
                'totalTokens',
            )
            .addSelect(
                `COUNT(CASE
            WHEN json_extract(span.attributes, '$.gen_ai.usage') IS NOT NULL
            AND (json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat'
                 OR json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat_model')
            THEN 1
        END)`,
                'chatModelInvocations',
            )
            // 一个月前的统计
            .addSelect(
                `COALESCE(SUM(CASE
            WHEN json_extract(span.attributes, '$.gen_ai.usage') IS NOT NULL
            AND (json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat'
                 OR json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat_model')
            AND span.startTimeUnixNano > (strftime('%s', 'now', '-1 month') * 1000000000)
            THEN (
                CAST(COALESCE(json_extract(span.attributes, '$.gen_ai.usage.input_tokens'), 0) AS INTEGER) +
                CAST(COALESCE(json_extract(span.attributes, '$.gen_ai.usage.output_tokens'), 0) AS INTEGER)
            )
            ELSE 0
        END), 0)`,
                'tokensMonthAgo',
            )
            // 一周前的统计
            .addSelect(
                `COALESCE(SUM(CASE
            WHEN json_extract(span.attributes, '$.gen_ai.usage') IS NOT NULL
            AND (json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat'
                 OR json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat_model')
            AND span.startTimeUnixNano > (strftime('%s', 'now', '-7 days') * 1000000000)
            THEN (
                CAST(COALESCE(json_extract(span.attributes, '$.gen_ai.usage.input_tokens'), 0) AS INTEGER) +
                CAST(COALESCE(json_extract(span.attributes, '$.gen_ai.usage.output_tokens'), 0) AS INTEGER)
            )
            ELSE 0
        END), 0)`,
                'tokensWeekAgo',
            )
            // 一年前的统计
            .addSelect(
                `COALESCE(SUM(CASE
            WHEN json_extract(span.attributes, '$.gen_ai.usage') IS NOT NULL
            AND (json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat'
                 OR json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat_model')
            AND span.startTimeUnixNano > (strftime('%s', 'now', '-1 year') * 1000000000)
            THEN (
                CAST(COALESCE(json_extract(span.attributes, '$.gen_ai.usage.input_tokens'), 0) AS INTEGER) +
                CAST(COALESCE(json_extract(span.attributes, '$.gen_ai.usage.output_tokens'), 0) AS INTEGER)
            )
            ELSE 0
        END), 0)`,
                'tokensYearAgo',
            )
            // 一个月内的调用次数
            .addSelect(
                `COUNT(CASE
                    WHEN (json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat'
                         OR json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat_model')
                    AND span.startTimeUnixNano > (strftime('%s', 'now', '-1 month') * 1000000000)
                    THEN 1
                END)`,
                'modelInvocationsMonthAgo',
            )
            // 一周内的调用次数
            .addSelect(
                `COUNT(CASE
                    WHEN (json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat'
                         OR json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat_model')
                    AND span.startTimeUnixNano > (strftime('%s', 'now', '-7 days') * 1000000000)
                    THEN 1
                END)`,
                'modelInvocationsWeekAgo',
            )
            // 一年内的调用次数
            .addSelect(
                `COUNT(CASE
                    WHEN (json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat'
                         OR json_extract(span.attributes, '$.gen_ai.operation.name') = 'chat_model')
                    AND span.startTimeUnixNano > (strftime('%s', 'now', '-1 year') * 1000000000)
                    THEN 1
                END)`,
                'modelInvocationsYearAgo',
            ),
})
export class ModelInvocationView extends BaseEntity {
    @ViewColumn()
    totalModelInvocations: number;

    @ViewColumn()
    totalTokens: number;

    @ViewColumn()
    chatModelInvocations: number;

    @ViewColumn()
    tokensWeekAgo: number;

    @ViewColumn()
    tokensMonthAgo: number;

    @ViewColumn()
    tokensYearAgo: number;

    @ViewColumn()
    modelInvocationsWeekAgo: number;

    @ViewColumn()
    modelInvocationsMonthAgo: number;

    @ViewColumn()
    modelInvocationsYearAgo: number;
}
