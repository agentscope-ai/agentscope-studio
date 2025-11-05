import { SpanKind as OTSpanKind } from '@opentelemetry/api';
import { DataSource } from 'typeorm';
import {
    SpanAttributes,
    SpanData,
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

// Helper functions for type conversion
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
    if (!status || typeof status !== 'object') {
        return { code: 0, message: '' };
    }
    const s = status as Record<string, unknown>;
    if ('code' in s && typeof s.code === 'number') {
        return {
            code: s.code,
            message: typeof s.message === 'string' ? s.message : '',
        };
    }
    // Convert old string format to status code
    const statusMap: Record<string, number> = {
        OK: 1,
        ERROR: 2,
        UNSET: 0,
    };
    const statusStr = typeof status === 'string' ? status : '';
    const upperStatus = (statusStr || 'UNSET').toUpperCase();
    return {
        code: statusMap[upperStatus] ?? 0,
        message: '',
    };
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
        version: '1.0.0',
        attributes: {},
    };
}

function getRunId(
    attributes: Record<string, unknown>,
    record: Record<string, unknown>,
): string {
    return (
        toStringOrUndefined(
            getNestedValue(attributes, 'gen_ai.conversation.id'),
        ) ||
        toStringOrUndefined(getNestedValue(attributes, 'project.run_id')) ||
        toStringOrUndefined(record.runId) ||
        toStringOrUndefined(record.run_id) ||
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

function convertOldRecordToSpanData(oldRecord: unknown): SpanData {
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
    const runId = getRunId(attributes, r);
    const spanId = getSpanId(r, attributes);

    const spanData: SpanData = {
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
        runId: runId,
        latencyNs: latencyNs,
    };

    return spanData;
}

export async function migrateSpanTable(dataSource: DataSource): Promise<void> {
    console.log('[Migration] Starting SpanTable migration...');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    let transactionActive = false;
    let oldTableName: string | null = null;

    try {
        await queryRunner.startTransaction();
        transactionActive = true;

        const tableName = 'span_table';
        if (!(await queryRunner.hasTable(tableName))) {
            console.log(
                '[Migration] span_table does not exist, skipping migration.',
            );
            await queryRunner.commitTransaction();
            transactionActive = false;
            return;
        }

        const table = await queryRunner.getTable(tableName);
        if (!table) {
            console.log(
                '[Migration] Cannot get table structure, skipping migration.',
            );
            await queryRunner.commitTransaction();
            transactionActive = false;
            return;
        }

        const hasSpanIdColumn = table.findColumnByName('spanId') !== undefined;
        const hasInstrumentationVersion =
            table.findColumnByName('instrumentationVersion') !== undefined;

        if (hasSpanIdColumn && hasInstrumentationVersion) {
            console.log(
                '[Migration] Table already has new structure, skipping migration.',
            );
            await queryRunner.commitTransaction();
            transactionActive = false;
            return;
        }

        // Drop dependent view if exists
        const viewName = 'model_invocation_view';
        try {
            const viewCheck = await queryRunner.query(
                `SELECT name FROM sqlite_master WHERE type='view' AND name=?`,
                [viewName],
            );
            if (viewCheck.length > 0) {
                console.log(`[Migration] Dropping view ${viewName}...`);
                await queryRunner.query(`DROP VIEW IF EXISTS ${viewName}`);
            }
        } catch (error) {
            console.log(
                `[Migration] View ${viewName} does not exist, continuing...`,
                error,
            );
        }

        await queryRunner.commitTransaction();
        transactionActive = false;

        // Backup old table
        await queryRunner.startTransaction();
        transactionActive = true;
        oldTableName = 'span_table_old_backup';
        console.log(`[Migration] Renaming old table to ${oldTableName}...`);
        await queryRunner.query(
            `ALTER TABLE "${tableName}" RENAME TO "${oldTableName}"`,
        );
        await queryRunner.commitTransaction();
        transactionActive = false;

        // Create new table structure
        console.log('[Migration] Creating new table structure...');
        const migrationDataSourceWithSync = new DataSource({
            ...dataSource.options,
            entities: [SpanTable],
            synchronize: true,
            logging: false,
        });
        await migrationDataSourceWithSync.initialize();

        try {
            const newQueryRunner =
                migrationDataSourceWithSync.createQueryRunner();
            await newQueryRunner.connect();
            await newQueryRunner.startTransaction();

            try {
                const oldRecords = await queryRunner.query(
                    `SELECT * FROM ${oldTableName}`,
                );

                if (oldRecords.length === 0) {
                    console.log(
                        '[Migration] No records found, dropping old table.',
                    );
                    await newQueryRunner.dropTable(oldTableName);
                    await newQueryRunner.commitTransaction();
                    await newQueryRunner.release();
                    return;
                }

                console.log(
                    `[Migration] Found ${oldRecords.length} records to migrate.`,
                );
                let migratedCount = 0;
                const skippedCount = 0;
                let errorCount = 0;
                const spanDataArray: SpanTable[] = [];
                const spanRepository =
                    migrationDataSourceWithSync.getRepository(SpanTable);

                for (const oldRecord of oldRecords) {
                    try {
                        if (!oldRecord.id) {
                            console.error(
                                `[Migration] Record missing 'id' field, skipping:`,
                                Object.keys(oldRecord),
                            );
                            errorCount++;
                            continue;
                        }

                        const spanData = convertOldRecordToSpanData(oldRecord);
                        const serviceName = getNestedValue(
                            spanData.resource.attributes,
                            'service.name',
                        );
                        const operationName = getNestedValue(
                            spanData.attributes,
                            'gen_ai.operation.name',
                        );
                        const instrumentationName =
                            spanData.scope.name ||
                            getNestedValue(
                                spanData.scope.attributes || {},
                                'server.name',
                            );
                        const instrumentationVersion =
                            spanData.scope.version ||
                            getNestedValue(
                                spanData.scope.attributes || {},
                                'server.version',
                            );
                        const model = getNestedValue(
                            spanData.attributes,
                            'gen_ai.request.model',
                        );
                        const inputTokens = getNestedValue(
                            spanData.attributes,
                            'gen_ai.usage.input_tokens',
                        );
                        const outputTokens = getNestedValue(
                            spanData.attributes,
                            'gen_ai.usage.output_tokens',
                        );

                        const totalTokens =
                            typeof inputTokens === 'number' &&
                            typeof outputTokens === 'number'
                                ? inputTokens + outputTokens
                                : undefined;

                        const statusCode = spanData.status.code || 0;

                        const span = new SpanTable();
                        Object.assign(span, {
                            id: spanData.spanId,
                            traceId: spanData.traceId,
                            spanId: spanData.spanId,
                            traceState: spanData.traceState,
                            parentSpanId: spanData.parentSpanId,
                            flags: spanData.flags,
                            name: spanData.name,
                            kind: spanData.kind,
                            startTimeUnixNano: spanData.startTimeUnixNano,
                            endTimeUnixNano: spanData.endTimeUnixNano,
                            attributes: spanData.attributes,
                            droppedAttributesCount:
                                spanData.droppedAttributesCount,
                            events: spanData.events,
                            droppedEventsCount: spanData.droppedEventsCount,
                            links: spanData.links,
                            droppedLinksCount: spanData.droppedLinksCount,
                            status: spanData.status,
                            resource: spanData.resource,
                            scope: spanData.scope,

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
                            runId: spanData.runId,
                            latencyNs: spanData.latencyNs,
                        });

                        spanDataArray.push(span);

                        if (spanDataArray.length >= 100) {
                            await spanRepository.save(spanDataArray);
                            migratedCount += spanDataArray.length;
                            console.log(
                                `[Migration] Progress: ${migratedCount}/${oldRecords.length} records migrated...`,
                            );
                            spanDataArray.length = 0;
                        }
                    } catch (error) {
                        console.error(
                            `[Migration] Error converting record with id: ${oldRecord.id || 'unknown'}`,
                            error,
                        );
                        if (error instanceof Error) {
                            console.error(
                                `[Migration] Error message: ${error.message}`,
                            );
                        }
                        errorCount++;
                    }
                }

                // Save remaining records
                if (spanDataArray.length > 0) {
                    try {
                        await spanRepository.save(spanDataArray);
                        migratedCount += spanDataArray.length;
                    } catch (error) {
                        console.error(
                            '[Migration] Error saving final batch:',
                            error,
                        );
                        errorCount += spanDataArray.length;
                    }
                }

                console.log(
                    `[Migration] Migration completed. Migrated: ${migratedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`,
                );

                console.log('[Migration] Dropping old backup table...');
                await newQueryRunner.dropTable(oldTableName);

                await newQueryRunner.commitTransaction();
                await newQueryRunner.release();
            } catch (error) {
                await newQueryRunner.rollbackTransaction();
                await newQueryRunner.release();
                throw error;
            }
        } finally {
            await migrationDataSourceWithSync.destroy();
        }
    } catch (error) {
        console.error('[Migration] Migration failed:', error);
        if (transactionActive) {
            try {
                await queryRunner.rollbackTransaction();
            } catch (rollbackError) {
                console.error(
                    '[Migration] Error during rollback:',
                    rollbackError,
                );
            }
        }
        throw error;
    } finally {
        await queryRunner.release();
    }
}
