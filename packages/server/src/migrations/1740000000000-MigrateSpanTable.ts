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
 * Migration: Migrate old span_table structure to new structure
 *
 * Tasks:
 * 1. Check if table exists and if migration has already been completed
 * 2. Drop related views
 * 3. Backup old table
 * 4. Create new table structure
 * 5. Migrate historical data
 * 6. Delete backup table
 */
export class MigrateSpanTable1740000000000 implements MigrationInterface {
    name = 'MigrateSpanTable1740000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('Starting migration: Migrating SpanTable structure...');

        const tableName = 'span_table';
        const viewName = 'model_invocation_view';
        const oldTableName = 'span_table_old_backup';

        // ========================================
        // Step 1: Check if table exists
        // ========================================
        console.log('Step 1: Checking table structure...');

        if (!(await queryRunner.hasTable(tableName))) {
            console.log('⏭️  span_table does not exist. Skipping migration.');
            return;
        }

        const table = await queryRunner.getTable(tableName);
        if (!table) {
            console.log('Unable to get table structure. Skipping migration.');
            return;
        }

        // Check if migration has already been completed
        // New structure has spanId and instrumentationVersion columns
        const hasSpanIdColumn = table.findColumnByName('spanId') !== undefined;
        const hasInstrumentationVersion =
            table.findColumnByName('instrumentationVersion') !== undefined;

        if (hasSpanIdColumn && hasInstrumentationVersion) {
            console.log(
                '✅ Table already has new structure. Migration already completed.',
            );
            return;
        }

        // ========================================
        // Step 2: Drop related views
        // ========================================
        console.log('Step 2: Dropping related views...');

        try {
            await queryRunner.query(`DROP VIEW IF EXISTS ${viewName}`);
            console.log(`Dropped view ${viewName}`);
        } catch (error) {
            console.warn(`Error dropping view (may not exist):`, error);
        }

        try {
            await queryRunner.query(
                `DELETE FROM typeorm_metadata WHERE type = 'VIEW' AND name = ?`,
                [viewName],
            );
        } catch {
            // Ignore error, table may not exist
        }

        // ========================================
        // Step 3: Backup old table
        // ========================================
        console.log('Step 3: Backing up old table...');

        // If backup table already exists, drop it first
        if (await queryRunner.hasTable(oldTableName)) {
            await queryRunner.dropTable(oldTableName, true);
        }

        await queryRunner.query(
            `ALTER TABLE "${tableName}" RENAME TO "${oldTableName}"`,
        );
        console.log(`Renamed table ${tableName} -> ${oldTableName}`);

        // ========================================
        // Step 4: Create new table structure
        // ========================================
        console.log('Step 4: Creating new table structure...');

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

        console.log('New table structure created successfully');

        // ========================================
        // Step 5: Migrate historical data
        // ========================================
        console.log('Step 5: Migrating historical data...');

        const oldRecords = await queryRunner.query(
            `SELECT * FROM ${oldTableName}`,
        );

        if (oldRecords.length === 0) {
            console.log('No data to migrate. Dropping backup table');
            await queryRunner.dropTable(oldTableName, true);
            console.log('✅ Migration completed!');
            return;
        }

        console.log(`Found ${oldRecords.length} records to migrate`);

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
                        `Failed to convert record (id: ${oldRecord?.id || 'unknown'}):`,
                        error,
                    );
                    errorCount++;
                }
            }

            if (spanTableArray.length > 0) {
                try {
                    // Use queryRunner.manager to save data
                    await queryRunner.manager.save(SpanTable, spanTableArray);
                    migratedCount += spanTableArray.length;
                } catch (error) {
                    console.error(`Batch save failed:`, error);
                    errorCount += spanTableArray.length;
                }
            }

            if (
                (i + batchSize) % 1000 === 0 ||
                i + batchSize >= oldRecords.length
            ) {
                console.log(
                    `Progress: Migrated ${Math.min(i + batchSize, oldRecords.length)}/${oldRecords.length} records`,
                );
            }
        }

        console.log(
            `Data migration completed. Success: ${migratedCount}, Failed: ${errorCount}`,
        );

        // ========================================
        // Step 6: Validate and drop backup table
        // ========================================
        console.log('Step 6: Validating data and dropping backup table...');

        const newTableCount = await queryRunner.query(
            `SELECT COUNT(*) as count FROM ${tableName}`,
        );
        const count = newTableCount[0]?.count || newTableCount[0]?.COUNT || 0;

        if (count !== migratedCount) {
            console.warn(
                `Warning: New table record count (${count}) does not match migrated count (${migratedCount})`,
            );
        }

        await queryRunner.dropTable(oldTableName, true);
        console.log('Backup table dropped');

        console.log('✅ Migration completed!');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('Starting migration rollback...');

        const tableName = 'span_table';
        const oldTableName = 'span_table_old_backup';

        // If backup table exists, restore it
        if (await queryRunner.hasTable(oldTableName)) {
            // Drop new table
            if (await queryRunner.hasTable(tableName)) {
                await queryRunner.dropTable(tableName, true);
            }

            // Restore old table
            await queryRunner.query(
                `ALTER TABLE "${oldTableName}" RENAME TO "${tableName}"`,
            );
            console.log('Restored old table structure');
        } else {
            console.warn('Backup table does not exist. Cannot rollback');
        }

        console.log('✅ Rollback completed');
    }
}
