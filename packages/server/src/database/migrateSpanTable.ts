import { SpanKind as OTSpanKind } from '@opentelemetry/api';
import { DataSource, DataSourceOptions } from 'typeorm';
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
import { SpanDao } from '../dao/Trace';
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

export async function migrateSpanTable(
    databaseConfig: DataSourceOptions,
): Promise<void> {
    console.log('[Migration] Starting SpanTable migration...');

    const migrationDataSource = new DataSource({
        ...databaseConfig,
        entities: [SpanTable],
        synchronize: false,
        logging: false,
    });
    await migrationDataSource.initialize();

    const viewName = 'model_invocation_view';
    const queryRunner = migrationDataSource.createQueryRunner();
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

        try {
            await queryRunner.query(`DROP VIEW IF EXISTS ${viewName}`);
        } catch {
            // Ignore if view doesn't exist
        }

        await queryRunner.commitTransaction();
        transactionActive = false;

        await queryRunner.startTransaction();
        transactionActive = true;
        oldTableName = 'span_table_old_backup';
        console.log(`[Migration] Renaming old table to ${oldTableName}...`);
        await queryRunner.query(
            `ALTER TABLE "${tableName}" RENAME TO "${oldTableName}"`,
        );
        await queryRunner.commitTransaction();
        transactionActive = false;

        console.log('[Migration] Creating new table structure...');
        const migrationDataSourceWithSync = new DataSource({
            ...databaseConfig,
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
                let errorCount = 0;
                for (const oldRecord of oldRecords) {
                    try {
                        const spanData = convertOldRecordToSpanData(oldRecord);
                        await SpanDao.saveSpans([spanData]);
                        migratedCount++;
                    } catch (error) {
                        console.error(
                            `[Migration] Error converting record with id: ${oldRecord?.id || 'unknown'}`,
                            error,
                        );
                        errorCount++;
                    }
                }

                console.log(
                    `[Migration] Migration completed. Migrated: ${migratedCount}, Errors: ${errorCount}`,
                );

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

        // Clean up view and typeorm_metadata for main DataSource to recreate
        try {
            try {
                await queryRunner.query(
                    `DELETE FROM typeorm_metadata WHERE type = 'VIEW' AND name = ?`,
                    [viewName],
                );
            } catch {
                // Ignore if table doesn't exist
            }
            await queryRunner.query(`DROP VIEW IF EXISTS ${viewName}`);
        } catch (error) {
            console.error(
                `[Migration] Error cleaning up view ${viewName}:`,
                error,
            );
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
        await migrationDataSource.destroy();
    }
}
