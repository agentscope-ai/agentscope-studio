import { BaseEntity, DataSource, ViewColumn, ViewEntity } from 'typeorm';
import { SpanTable } from './Trace';

@ViewEntity({
    expression: (dataSource: DataSource) =>
        dataSource
            .createQueryBuilder()
            .from(SpanTable, 'span')
            .innerJoin('run_table', 'run', 'run.id = span.conversationId')
            .select(
                `COUNT(CASE
                    WHEN (span.operationName = 'chat'
                         OR span.operationName = 'chat_model')
                    THEN 1
                END)`,
                'totalModelInvocations',
            )
            .addSelect(
                `COALESCE(SUM(CASE
            WHEN span.totalTokens IS NOT NULL
            AND (span.operationName = 'chat'
                 OR span.operationName = 'chat_model')
            THEN CAST(span.totalTokens AS INTEGER)
            ELSE 0
        END), 0)`,
                'totalTokens',
            )
            .addSelect(
                `COUNT(CASE
            WHEN span.totalTokens IS NOT NULL
            AND (span.operationName = 'chat'
                 OR span.operationName = 'chat_model')
            THEN 1
        END)`,
                'chatModelInvocations',
            )
            // A month ago
            .addSelect(
                `COALESCE(SUM(CASE
            WHEN span.totalTokens IS NOT NULL
            AND (span.operationName = 'chat'
                 OR span.operationName = 'chat_model')
            AND span.startTimeUnixNano > (strftime('%s', 'now', '-1 month') * 1000000000)
            THEN CAST(span.totalTokens AS INTEGER)
            ELSE 0
        END), 0)`,
                'tokensMonthAgo',
            )
            // A week ago
            .addSelect(
                `COALESCE(SUM(CASE
            WHEN span.totalTokens IS NOT NULL
            AND (span.operationName = 'chat'
                 OR span.operationName = 'chat_model')
            AND span.startTimeUnixNano > (strftime('%s', 'now', '-7 days') * 1000000000)
            THEN CAST(span.totalTokens AS INTEGER)
            ELSE 0
        END), 0)`,
                'tokensWeekAgo',
            )
            // A year ago
            .addSelect(
                `COALESCE(SUM(CASE
            WHEN span.totalTokens IS NOT NULL
            AND (span.operationName = 'chat'
                 OR span.operationName = 'chat_model')
            AND span.startTimeUnixNano > (strftime('%s', 'now', '-1 year') * 1000000000)
            THEN CAST(span.totalTokens AS INTEGER)
            ELSE 0
        END), 0)`,
                'tokensYearAgo',
            )
            // A month ago
            .addSelect(
                `COUNT(CASE
                    WHEN (span.operationName = 'chat'
                         OR span.operationName = 'chat_model')
                    AND span.startTimeUnixNano > (strftime('%s', 'now', '-1 month') * 1000000000)
                    THEN 1
                END)`,
                'modelInvocationsMonthAgo',
            )
            // A week ago
            .addSelect(
                `COUNT(CASE
                    WHEN (span.operationName = 'chat'
                         OR span.operationName = 'chat_model')
                    AND span.startTimeUnixNano > (strftime('%s', 'now', '-7 days') * 1000000000)
                    THEN 1
                END)`,
                'modelInvocationsWeekAgo',
            )
            // A year ago
            .addSelect(
                `COUNT(CASE
                    WHEN (span.operationName = 'chat'
                         OR span.operationName = 'chat_model')
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
