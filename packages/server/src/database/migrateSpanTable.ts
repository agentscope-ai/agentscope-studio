import { SpanKind as OTSpanKind } from '@opentelemetry/api';
import { DataSource } from 'typeorm';
import {
    SpanAttributes,
    SpanData,
    SpanEvent,
    SpanLink,
    SpanResource,
    SpanScope
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


// Parse JSON string or return object/empty
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

// Decode status from unknown format
function decodeStatus(status: unknown): { code: number; message: string } {
    if (!status || typeof status !== 'object') {
        return { code: 0, message: '' }; // UNSET
    }
    const s = status as Record<string, unknown>;
    if ('code' in s && typeof s.code === 'number') {
        return {
            code: s.code,
            message: typeof s.message === 'string' ? s.message : '',
        };
    }
    // Old format (string) - convert to JSON object
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

// Decode events array
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
            attributes: (e.attributes && typeof e.attributes === 'object' && e.attributes !== null
                ? (e.attributes as Record<string, unknown>)
                : {}) as SpanAttributes,
            droppedAttributesCount: asNumber(e.droppedAttributesCount, 0),
        };
    });
}

// Decode resource from attributes
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

// Decode scope
function decodeScope(): SpanScope {
    return {
        name: 'agentscope',
        version: '1.0.0',
        attributes: {},
    };
}

// Get runId from attributes or record
function getRunId(
    attributes: Record<string, unknown>,
    record: Record<string, unknown>,
): string {
    return (
        toStringOrUndefined(getNestedValue(attributes, 'gen_ai.conversation.id')) ||
        toStringOrUndefined(getNestedValue(attributes, 'project.run_id')) ||
        toStringOrUndefined(record.runId) ||
        toStringOrUndefined(record.run_id) ||
        'unknown'
    );
}

// Get spanId from record or attributes
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

// Convert old database record to SpanData format
function convertOldRecordToSpanData(oldRecord: unknown): SpanData {
    const r = oldRecord as Record<string, unknown>;

    // Parse attributes
    let attributes = parseJsonOrObject(r.attributes);

    // Convert old protocol attributes to new format
    const convertedResult = SpanProcessor.convertOldProtocolToNew(
        attributes,
        { name: asString(r.name) },
    );
    const spanName = convertedResult.span_name || asString(r.name);
    attributes = convertedResult.attributes || attributes;

    // Convert times - prioritize old format (startTime/endTime), then new format
    const startTimeUnixNano = asString(r.startTime)
        ? encodeUnixNano(asString(r.startTime))
        : asString(r.startTimeUnixNano, '0');

    const endTimeUnixNano = asString(r.endTime)
        ? encodeUnixNano(asString(r.endTime))
        : asString(r.endTimeUnixNano, '0');

    // Convert latency - prioritize old format (latencyMs), then new format, else calculate
    const latencyNs = asNumber(r.latencyMs, 0) > 0
        ? asNumber(r.latencyMs) * 1_000_000
        : asNumber(r.latencyNs, 0) > 0
            ? asNumber(r.latencyNs)
            : getTimeDifferenceNano(startTimeUnixNano, endTimeUnixNano);

    // Decode status, events, resource, scope
    const statusObj = decodeStatus(r.status);
    // Preserve statusMessage if present
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

        // Check if table exists
        const tableName = 'span_table';
        const tableExists = await queryRunner.hasTable(tableName);

        if (!tableExists) {
            console.log(
                '[Migration] span_table does not exist, skipping migration.',
            );
            await queryRunner.commitTransaction();
            transactionActive = false;
            return;
        }

        // Get table structure to check which columns exist
        const table = await queryRunner.getTable(tableName);
        if (!table) {
            console.log(
                '[Migration] Cannot get table structure, skipping migration.',
            );
            await queryRunner.commitTransaction();
            transactionActive = false;
            return;
        }

        // Check if table has the new structure (has spanId column)
        const hasSpanIdColumn = table.findColumnByName('spanId') !== undefined;
        const hasInstrumentationVersion =
            table.findColumnByName('instrumentationVersion') !== undefined;

        // If table already has the new structure, skip migration
        if (hasSpanIdColumn && hasInstrumentationVersion) {
            console.log(
                '[Migration] Table already has new structure, skipping migration.',
            );
            await queryRunner.commitTransaction();
            transactionActive = false;
            return;
        }

        // Step 1: Drop views that depend on span_table to avoid dependency issues
        const viewName = 'model_invocation_view';
        const viewExists = await queryRunner.hasTable(viewName);
        if (viewExists) {
            console.log(
                `[Migration] Dropping view ${viewName} before migration...`,
            );
            // Use raw SQL to drop view (TypeORM doesn't have a dropView method for all databases)
            await queryRunner.query(`DROP VIEW IF EXISTS ${viewName}`);
            console.log(`[Migration] View ${viewName} dropped.`);
        }

        // Step 2: Commit the view drop before renaming table
        // SQLite validates view dependencies when renaming tables, so we need to commit the view drop first
        await queryRunner.commitTransaction();
        transactionActive = false;

        // Step 3: Verify view is actually dropped by checking schema
        const viewStillExists = await queryRunner.query(
            `SELECT name FROM sqlite_master WHERE type='view' AND name=?`,
            [viewName],
        );
        if (viewStillExists.length > 0) {
            console.log(
                `[Migration] Warning: View ${viewName} still exists after drop, trying to drop again...`,
            );
            await queryRunner.query(`DROP VIEW IF EXISTS ${viewName}`);
        }

        // Step 4: Start new transaction for table rename
        await queryRunner.startTransaction();
        transactionActive = true;

        // Step 5: Backup old table by renaming it using raw SQL to avoid TypeORM's view checking
        oldTableName = 'span_table_old_backup';
        console.log(`[Migration] Renaming old table to ${oldTableName}...`);
        // Use raw SQL ALTER TABLE RENAME instead of TypeORM's renameTable to avoid view dependency checks
        await queryRunner.query(
            `ALTER TABLE "${tableName}" RENAME TO "${oldTableName}"`,
        );

        // Step 6: Commit the rename before creating new table
        await queryRunner.commitTransaction();
        transactionActive = false;

        // Step 7: Use synchronize to create the new table structure
        console.log('[Migration] Creating new table structure...');
        const migrationDataSourceWithSync = new DataSource({
            ...dataSource.options,
            entities: [SpanTable],
            synchronize: true,
            logging: false,
        });
        await migrationDataSourceWithSync.initialize();

        try {
            // Step 8: Start a new transaction to migrate data
            const newQueryRunner =
                migrationDataSourceWithSync.createQueryRunner();
            await newQueryRunner.connect();
            await newQueryRunner.startTransaction();

            try {
                // Step 9: Get all records from the old table (using original queryRunner)
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

                // Step 10: Convert old records to SpanData and batch process
                let migratedCount = 0;
                const skippedCount = 0;
                let errorCount = 0;
                const spanDataArray: SpanTable[] = [];
                const spanRepository =
                    migrationDataSourceWithSync.getRepository(SpanTable);

                for (const oldRecord of oldRecords) {
                    try {
                        // Validate that old record has an id (primary key from old table)
                        if (!oldRecord.id) {
                            console.error(
                                `[Migration] Record missing 'id' field, skipping:`,
                                Object.keys(oldRecord),
                            );
                            errorCount++;
                            continue;
                        }

                        // Convert old record to SpanData
                        const spanData = convertOldRecordToSpanData(oldRecord);

                        // Create SpanTable instance manually (similar to SpanDao.saveSpans logic)
                        // Extract key fields for indexing
                        const serviceName = getNestedValue(
                            spanData.resource.attributes,
                            'service.name',
                        );
                        const operationName = getNestedValue(
                            spanData.attributes,
                            'gen_ai.operation.name',
                        );
                        // Use scope.name and scope.version directly (per SpanTable comments),
                        // but fallback to attributes for backward compatibility
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
                            serviceName,
                            operationName,
                            instrumentationName,
                            instrumentationVersion,
                            model,
                            inputTokens,
                            outputTokens,
                            runId: spanData.runId,
                            latencyNs: spanData.latencyNs,
                        });

                        spanDataArray.push(span);

                        // Batch save every 100 records
                        if (spanDataArray.length >= 100) {
                            await spanRepository.save(spanDataArray);
                            migratedCount += spanDataArray.length;
                            console.log(
                                `[Migration] Progress: ${migratedCount}/${oldRecords.length} records migrated...`,
                            );
                            spanDataArray.length = 0; // Clear array
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

                // Step 11: Drop the old backup table
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
