import { SpanKind as OTSpanKind } from '@opentelemetry/api';
import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import {
    SpanAttributes,
    SpanEvent,
    SpanLink,
    SpanResource,
    SpanScope,
} from '../../../shared/src/types/trace';
import { getNestedValue } from '../../../shared/src/utils/objectUtils';
import {
    encodeUnixNano,
    getTimeDifferenceNano,
} from '../../../shared/src/utils/timeUtils';
import { SpanTable } from '../models/Trace';
import { SpanProcessor } from '../otel/processor';

const asString = (value: unknown, fallback = ''): string =>
    typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number =>
    typeof value === 'number' ? value : fallback;

const asOptionalString = (value: unknown): string | undefined =>
    typeof value === 'string' ? value : undefined;

const asOptionalNumber = (value: unknown): number | undefined =>
    typeof value === 'number' ? value : undefined;

const toStringOrUndefined = (value: unknown): string | undefined =>
    value !== undefined && value !== null ? String(value) : undefined;

function parseJsonOrObject(value: unknown): Record<string, unknown> {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value) as Record<string, unknown>;
        } catch {
            return {};
        }
    }
    if (value && typeof value === 'object') {
        return value as Record<string, unknown>;
    }
    return {};
}

function decodeStatus(status: unknown): { code: number; message: string } {
    if (typeof status === 'string') {
        const statusMap: Record<string, number> = {
            OK: 1,
            ERROR: 2,
            UNSET: 0,
        };
        const upperStatus = status.toUpperCase();
        return {
            code: statusMap[upperStatus] ?? 0,
            message: '',
        };
    }

    if (status && typeof status === 'object') {
        const s = status as Record<string, unknown>;
        if ('code' in s && typeof s.code === 'number') {
            return {
                code: s.code,
                message: typeof s.message === 'string' ? s.message : '',
            };
        }
    }
    return { code: 0, message: '' };
}

function decodeEvents(eventsValue: unknown): SpanEvent[] {
    if (!eventsValue) return [];
    let eventsArray: unknown[] = [];
    if (typeof eventsValue === 'string') {
        try {
            eventsArray = JSON.parse(eventsValue) as unknown[];
        } catch {
            eventsArray = [];
        }
    } else if (Array.isArray(eventsValue)) {
        eventsArray = eventsValue;
    }

    return eventsArray.map((event: unknown) => {
        const e = event as Record<string, unknown>;
        const timeUnixNano = asString(e.timestamp)
            ? encodeUnixNano(asString(e.timestamp))
            : asString(e.timeUnixNano) || asString(e.time) || '0';
        return {
            name: asString(e.name),
            time: timeUnixNano,
            attributes: (e.attributes &&
                typeof e.attributes === 'object' &&
                e.attributes !== null
                ? (e.attributes as Record<string, unknown>)
                : {}) as SpanAttributes,
            droppedAttributesCount: asNumber(e.droppedAttributesCount, 0),
        };
    });
}

function decodeResource(attributes: Record<string, unknown>): SpanResource {
    const serviceName =
        getNestedValue(attributes, 'service.name') ||
        getNestedValue(attributes, 'project.service_name');
    const resourceAttributes: Record<string, unknown> = {};
    if (serviceName) {
        resourceAttributes['service.name'] = serviceName;
    }
    const resourceKeys = [
        'service.namespace',
        'service.version',
        'service.instance.id',
    ];
    for (const key of resourceKeys) {
        const value = getNestedValue(attributes, key);
        if (value !== undefined) {
            resourceAttributes[key] = value;
        }
    }
    return {
        attributes: resourceAttributes as SpanAttributes,
    };
}

function decodeScope(): SpanScope {
    return {
        name: 'agentscope',
        version: '1.0.7',
        attributes: {},
    };
}

function getConversationId(
    attributes: Record<string, unknown>,
    record: Record<string, unknown>,
): string {
    return (
        toStringOrUndefined(
            getNestedValue(attributes, 'gen_ai.conversation.id'),
        ) ||
        toStringOrUndefined(getNestedValue(attributes, 'project.run_id')) ||
        toStringOrUndefined(record.conversationId) ||
        toStringOrUndefined(record.conversation_id) ||
        'unknown'
    );
}

function getSpanId(
    record: Record<string, unknown>,
    attributes: Record<string, unknown>,
): string {
    const spanId =
        toStringOrUndefined(record.id) ||
        toStringOrUndefined(record.spanId) ||
        toStringOrUndefined(getNestedValue(attributes, 'span.id')) ||
        toStringOrUndefined(getNestedValue(attributes, 'spanId'));
    if (!spanId) {
        throw new Error(
            `Cannot determine spanId for record. Record has no 'id' field: ${JSON.stringify(record)}`,
        );
    }
    return spanId;
}

// Helper methods to extract key fields (similar to SpanDao)
function extractServiceName(resource: SpanResource): string | undefined {
    const value = getNestedValue(resource.attributes, 'service.name');
    return typeof value === 'string' ? value : undefined;
}

function extractOperationName(
    attributes: Record<string, unknown>,
): string | undefined {
    const value = getNestedValue(attributes, 'gen_ai.operation.name');
    return typeof value === 'string' ? value : undefined;
}

function extractInstrumentationName(scope: SpanScope): string | undefined {
    // Try to get from attributes first (for backward compatibility)
    const valueFromAttributes = getNestedValue(scope.attributes, 'server.name');
    if (typeof valueFromAttributes === 'string') {
        return valueFromAttributes;
    }
    // Fallback to scope.name
    return scope.name;
}

function extractInstrumentationVersion(scope: SpanScope): string | undefined {
    // Try to get from attributes first (for backward compatibility)
    const valueFromAttributes = getNestedValue(
        scope.attributes,
        'server.version',
    );
    if (typeof valueFromAttributes === 'string') {
        return valueFromAttributes;
    }
    // Fallback to scope.version
    return scope.version;
}

function extractModel(attributes: Record<string, unknown>): string | undefined {
    const value = getNestedValue(attributes, 'gen_ai.request.model');
    return typeof value === 'string' ? value : undefined;
}

function extractInputTokens(
    attributes: Record<string, unknown>,
): number | undefined {
    const value = getNestedValue(attributes, 'gen_ai.usage.input_tokens');
    return typeof value === 'number' ? value : undefined;
}

function extractOutputTokens(
    attributes: Record<string, unknown>,
): number | undefined {
    const value = getNestedValue(attributes, 'gen_ai.usage.output_tokens');
    return typeof value === 'number' ? value : undefined;
}

function calculateTotalTokens(
    inputTokens: number | undefined,
    outputTokens: number | undefined,
): number | undefined {
    // If both are numbers, return their sum
    if (typeof inputTokens === 'number' && typeof outputTokens === 'number') {
        return inputTokens + outputTokens;
    }
    // If only inputTokens is available, return it
    if (typeof inputTokens === 'number') {
        return inputTokens;
    }
    // If only outputTokens is available, return it
    if (typeof outputTokens === 'number') {
        return outputTokens;
    }
    // If neither is available, return undefined
    return undefined;
}

function convertOldRecordToSpanTable(oldRecord: unknown): SpanTable {
    const r = oldRecord as Record<string, unknown>;

    let attributes = parseJsonOrObject(r.attributes);
    const convertedResult = SpanProcessor.convertOldProtocolToNew(attributes, {
        name: asString(r.name),
    });
    const spanName = convertedResult.span_name || asString(r.name);
    attributes = convertedResult.attributes || attributes;

    const startTimeUnixNano = asString(r.startTime)
        ? encodeUnixNano(asString(r.startTime))
        : asString(r.startTimeUnixNano, '0');
    const endTimeUnixNano = asString(r.endTime)
        ? encodeUnixNano(asString(r.endTime))
        : asString(r.endTimeUnixNano, '0');

    const latencyNs =
        asNumber(r.latencyMs, 0) > 0
            ? asNumber(r.latencyMs) * 1_000_000
            : asNumber(r.latencyNs, 0) > 0
                ? asNumber(r.latencyNs)
                : getTimeDifferenceNano(startTimeUnixNano, endTimeUnixNano);

    const statusObj = decodeStatus(r.status);
    const statusMessage = asOptionalString(r.statusMessage);
    const status = statusMessage
        ? { ...statusObj, message: statusMessage }
        : statusObj;
    const events = decodeEvents(r.events);
    const resource = decodeResource(attributes);
    const scope = decodeScope();
    const conversationId = getConversationId(attributes, r);
    const spanId = getSpanId(r, attributes);

    // Extract key fields for indexing
    const serviceName = extractServiceName(resource);
    const operationName = extractOperationName(attributes);
    const instrumentationName = extractInstrumentationName(scope);
    const instrumentationVersion = extractInstrumentationVersion(scope);
    const model = extractModel(attributes);
    const inputTokens = extractInputTokens(attributes);
    const outputTokens = extractOutputTokens(attributes);
    const totalTokens = calculateTotalTokens(inputTokens, outputTokens);
    const statusCode = statusObj.code || 0;

    const span = new SpanTable();
    Object.assign(span, {
        id: String(spanId),
        traceId: toStringOrUndefined(r.traceId) || '',
        spanId: String(spanId),
        traceState: toStringOrUndefined(r.traceState),
        parentSpanId: toStringOrUndefined(r.parentSpanId),
        flags: asOptionalNumber(r.flags),
        name: spanName,
        kind: asNumber(r.kind, 0) as OTSpanKind,
        startTimeUnixNano: startTimeUnixNano,
        endTimeUnixNano: endTimeUnixNano,
        attributes: attributes as SpanAttributes,
        droppedAttributesCount: 0,
        events: events,
        droppedEventsCount: 0,
        links: [] as SpanLink[],
        droppedLinksCount: 0,
        status: status,
        resource: resource,
        scope: scope,
        statusCode: statusCode,
        serviceName: serviceName,
        operationName: operationName,
        instrumentationName: instrumentationName,
        instrumentationVersion: instrumentationVersion,
        model: model,
        inputTokens: inputTokens,
        outputTokens: outputTokens,
        totalTokens: totalTokens,
        conversationId: conversationId,
        latencyNs: latencyNs,
    });

    return span;
}

/**
 * 迁移：将旧的 span_table 结构迁移到新结构
 *
 * 任务：
 * 1. 检查表是否存在以及是否已经迁移
 * 2. 删除相关视图
 * 3. 备份旧表
 * 4. 创建新表结构
 * 5. 迁移历史数据
 * 6. 删除备份表
 */
export class MigrateSpanTable1740000000000 implements MigrationInterface {
    name = 'MigrateSpanTable1740000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('开始迁移：迁移 SpanTable 结构...');

        const tableName = 'span_table';
        const viewName = 'model_invocation_view';
        const oldTableName = 'span_table_old_backup';

        // ========================================
        // 步骤 1: 检查表是否存在
        // ========================================
        console.log('步骤 1: 检查表结构...');

        if (!(await queryRunner.hasTable(tableName))) {
            console.log('span_table 不存在，跳过迁移');
            return;
        }

        const table = await queryRunner.getTable(tableName);
        if (!table) {
            console.log('无法获取表结构，跳过迁移');
            return;
        }

        // 检查是否已经迁移过（新结构有 spanId 和 instrumentationVersion 列）
        const hasSpanIdColumn = table.findColumnByName('spanId') !== undefined;
        const hasInstrumentationVersion =
            table.findColumnByName('instrumentationVersion') !== undefined;

        if (hasSpanIdColumn && hasInstrumentationVersion) {
            console.log('表已经是新结构，跳过迁移');
            return;
        }

        // ========================================
        // 步骤 2: 删除相关视图
        // ========================================
        console.log('步骤 2: 删除相关视图...');

        try {
            await queryRunner.query(`DROP VIEW IF EXISTS ${viewName}`);
            console.log(`已删除视图 ${viewName}`);
        } catch (error) {
            console.warn(`删除视图时出错（可能不存在）:`, error);
        }

        try {
            await queryRunner.query(
                `DELETE FROM typeorm_metadata WHERE type = 'VIEW' AND name = ?`,
                [viewName],
            );
        } catch {
            // 忽略错误，表可能不存在
        }

        // ========================================
        // 步骤 3: 备份旧表
        // ========================================
        console.log('步骤 3: 备份旧表...');

        // 如果备份表已存在，先删除
        if (await queryRunner.hasTable(oldTableName)) {
            await queryRunner.dropTable(oldTableName, true);
        }

        await queryRunner.query(
            `ALTER TABLE "${tableName}" RENAME TO "${oldTableName}"`,
        );
        console.log(`已重命名表 ${tableName} -> ${oldTableName}`);

        // ========================================
        // 步骤 4: 创建新表结构
        // ========================================
        console.log('步骤 4: 创建新表结构...');

        await queryRunner.createTable(
            new Table({
                name: tableName,
                columns: [
                    {
                        name: 'id',
                        type: 'varchar',
                        isPrimary: true,
                        isNullable: false,
                    },
                    {
                        name: 'traceId',
                        type: 'varchar',
                        isNullable: false,
                    },
                    {
                        name: 'spanId',
                        type: 'varchar',
                        isNullable: false,
                    },
                    {
                        name: 'traceState',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'parentSpanId',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'flags',
                        type: 'integer',
                        isNullable: true,
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        isNullable: false,
                    },
                    {
                        name: 'kind',
                        type: 'integer',
                        isNullable: false,
                    },
                    {
                        name: 'startTimeUnixNano',
                        type: 'varchar',
                        isNullable: false,
                    },
                    {
                        name: 'endTimeUnixNano',
                        type: 'varchar',
                        isNullable: false,
                    },
                    {
                        name: 'attributes',
                        type: 'json',
                        isNullable: false,
                    },
                    {
                        name: 'droppedAttributesCount',
                        type: 'integer',
                        isNullable: true,
                    },
                    {
                        name: 'events',
                        type: 'json',
                        isNullable: true,
                    },
                    {
                        name: 'droppedEventsCount',
                        type: 'integer',
                        isNullable: true,
                    },
                    {
                        name: 'links',
                        type: 'json',
                        isNullable: true,
                    },
                    {
                        name: 'droppedLinksCount',
                        type: 'integer',
                        isNullable: true,
                    },
                    {
                        name: 'status',
                        type: 'json',
                        isNullable: false,
                    },
                    {
                        name: 'resource',
                        type: 'json',
                        isNullable: false,
                    },
                    {
                        name: 'scope',
                        type: 'json',
                        isNullable: false,
                    },
                    {
                        name: 'statusCode',
                        type: 'integer',
                        isNullable: true,
                    },
                    {
                        name: 'serviceName',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'operationName',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'instrumentationName',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'instrumentationVersion',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'model',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'inputTokens',
                        type: 'integer',
                        isNullable: true,
                    },
                    {
                        name: 'outputTokens',
                        type: 'integer',
                        isNullable: true,
                    },
                    {
                        name: 'totalTokens',
                        type: 'integer',
                        isNullable: true,
                    },
                    {
                        name: 'conversationId',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'latencyNs',
                        type: 'float',
                        isNullable: false,
                    },
                ],
                indices: [
                    {
                        name: 'IDX_span_traceId',
                        columnNames: ['traceId'],
                    },
                    {
                        name: 'IDX_span_spanId',
                        columnNames: ['spanId'],
                    },
                    {
                        name: 'IDX_span_parentSpanId',
                        columnNames: ['parentSpanId'],
                    },
                    {
                        name: 'IDX_span_startTimeUnixNano',
                        columnNames: ['startTimeUnixNano'],
                    },
                    {
                        name: 'IDX_span_statusCode',
                        columnNames: ['statusCode'],
                    },
                    {
                        name: 'IDX_span_latencyNs',
                        columnNames: ['latencyNs'],
                    },
                    {
                        name: 'IDX_span_serviceName',
                        columnNames: ['serviceName'],
                    },
                    {
                        name: 'IDX_span_operationName',
                        columnNames: ['operationName'],
                    },
                    {
                        name: 'IDX_span_instrumentationName',
                        columnNames: ['instrumentationName'],
                    },
                    {
                        name: 'IDX_span_model',
                        columnNames: ['model'],
                    },
                    {
                        name: 'IDX_span_inputTokens',
                        columnNames: ['inputTokens'],
                    },
                    {
                        name: 'IDX_span_outputTokens',
                        columnNames: ['outputTokens'],
                    },
                    {
                        name: 'IDX_span_totalTokens',
                        columnNames: ['totalTokens'],
                    },
                    {
                        name: 'IDX_span_conversationId',
                        columnNames: ['conversationId'],
                    },
                ],
            }),
            true,
        );

        console.log('新表结构创建成功');

        // ========================================
        // 步骤 5: 迁移历史数据
        // ========================================
        console.log('步骤 5: 迁移历史数据...');

        const oldRecords = await queryRunner.query(
            `SELECT * FROM ${oldTableName}`,
        );

        if (oldRecords.length === 0) {
            console.log('没有需要迁移的数据，删除备份表');
            await queryRunner.dropTable(oldTableName, true);
            console.log('✅ 迁移完成！');
            return;
        }

        console.log(`找到 ${oldRecords.length} 条记录需要迁移`);

        let migratedCount = 0;
        let errorCount = 0;
        const batchSize = 100;

        for (let i = 0; i < oldRecords.length; i += batchSize) {
            const batch = oldRecords.slice(i, i + batchSize);
            const spanTableArray: SpanTable[] = [];

            for (const oldRecord of batch) {
                try {
                    const spanTable = convertOldRecordToSpanTable(oldRecord);
                    spanTableArray.push(spanTable);
                } catch (error) {
                    console.error(
                        `转换记录失败 (id: ${oldRecord?.id || 'unknown'}):`,
                        error,
                    );
                    errorCount++;
                }
            }

            if (spanTableArray.length > 0) {
                try {
                    // 使用 queryRunner.manager 保存数据
                    await queryRunner.manager.save(SpanTable, spanTableArray);
                    migratedCount += spanTableArray.length;
                } catch (error) {
                    console.error(`批量保存失败:`, error);
                    errorCount += spanTableArray.length;
                }
            }

            if (
                (i + batchSize) % 1000 === 0 ||
                i + batchSize >= oldRecords.length
            ) {
                console.log(
                    `进度：已迁移 ${Math.min(i + batchSize, oldRecords.length)}/${oldRecords.length} 条记录`,
                );
            }
        }

        console.log(
            `数据迁移完成。成功: ${migratedCount}, 失败: ${errorCount}`,
        );

        // ========================================
        // 步骤 6: 验证并删除备份表
        // ========================================
        console.log('步骤 6: 验证数据并删除备份表...');

        const newTableCount = await queryRunner.query(
            `SELECT COUNT(*) as count FROM ${tableName}`,
        );
        const count = newTableCount[0]?.count || newTableCount[0]?.COUNT || 0;

        if (count !== migratedCount) {
            console.warn(
                `警告：新表记录数 (${count}) 与迁移记录数 (${migratedCount}) 不一致`,
            );
        }

        await queryRunner.dropTable(oldTableName, true);
        console.log('备份表已删除');

        console.log('✅ 迁移完成！');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('开始回滚迁移...');

        const tableName = 'span_table';
        const oldTableName = 'span_table_old_backup';

        // 如果备份表存在，恢复它
        if (await queryRunner.hasTable(oldTableName)) {
            // 删除新表
            if (await queryRunner.hasTable(tableName)) {
                await queryRunner.dropTable(tableName, true);
            }

            // 恢复旧表
            await queryRunner.query(
                `ALTER TABLE "${oldTableName}" RENAME TO "${tableName}"`,
            );
            console.log('已恢复旧表结构');
        } else {
            console.warn('备份表不存在，无法回滚');
        }

        console.log('✅ 回滚完成');
    }
}
