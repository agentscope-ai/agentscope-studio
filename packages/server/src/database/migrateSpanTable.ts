import { SpanKind as OTSpanKind } from '@opentelemetry/api';
import { DataSource } from 'typeorm';
import {
    OldSpanKind,
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

// OpenTelemetry SpanKind enum values
enum SpanKind {
    SPAN_KIND_UNSPECIFIED = 0,
    SPAN_KIND_INTERNAL = 1,
    SPAN_KIND_SERVER = 2,
    SPAN_KIND_CLIENT = 3,
    SPAN_KIND_PRODUCER = 4,
    SPAN_KIND_CONSUMER = 5,
}

// Status code mapping
function convertStatus(
    status: string,
    statusMessage?: string,
): { code: number; message: string } {
    const statusMap: Record<string, number> = {
        OK: 1,
        ERROR: 2,
        UNSET: 0,
    };

    const upperStatus = (status || 'UNSET').toUpperCase();
    return {
        code: statusMap[upperStatus] ?? 0,
        message: statusMessage || '',
    };
}

// Convert old spanKind string to OpenTelemetry SpanKind number
function convertSpanKind(spanKind: string): number {
    // Map old AgentScope span kinds to OpenTelemetry internal kind
    // Most custom span kinds should map to INTERNAL (1)
    const kindMap: Record<string, number> = {
        [OldSpanKind.AGENT]: SpanKind.SPAN_KIND_INTERNAL,
        [OldSpanKind.TOOL]: SpanKind.SPAN_KIND_INTERNAL,
        [OldSpanKind.LLM]: SpanKind.SPAN_KIND_INTERNAL,
        [OldSpanKind.EMBEDDING]: SpanKind.SPAN_KIND_INTERNAL,
        [OldSpanKind.FORMATTER]: SpanKind.SPAN_KIND_INTERNAL,
        [OldSpanKind.COMMON]: SpanKind.SPAN_KIND_INTERNAL,
    };

    return kindMap[spanKind] ?? SpanKind.SPAN_KIND_INTERNAL;
}

// Convert ISO time string to unix nano timestamp string
function convertTimeToUnixNano(timeStr: string): string {
    if (!timeStr) {
        return '0';
    }
    return encodeUnixNano(timeStr);
}

// Convert milliseconds to nanoseconds
function convertLatencyMsToNs(latencyMs: number): number {
    return latencyMs * 1_000_000;
}

// Convert old database record to SpanData format
function convertOldRecordToSpanData(
    oldRecord: Record<string, unknown>,
): SpanData {
    // Parse attributes
    let attributes: Record<string, unknown> = {};
    if (typeof oldRecord.attributes === 'string') {
        try {
            attributes = JSON.parse(oldRecord.attributes) as Record<
                string,
                unknown
            >;
        } catch {
            attributes = {};
        }
    } else if (
        oldRecord.attributes &&
        typeof oldRecord.attributes === 'object'
    ) {
        attributes = oldRecord.attributes as Record<string, unknown>;
    }

    // Convert old protocol attributes to new format using processor logic
    const nameValue = oldRecord.name;
    const mockSpan = { name: typeof nameValue === 'string' ? nameValue : '' };
    const convertedResult = SpanProcessor.convertOldProtocolToNew(
        attributes,
        mockSpan,
    );
    const spanName =
        convertedResult.span_name ||
        (typeof nameValue === 'string' ? nameValue : '');
    attributes = convertedResult.attributes || attributes;

    // Convert spanKind to OpenTelemetry SpanKind number
    // Try old format first (spanKind as string), then new format (kind as number)
    let kind: OTSpanKind;
    if (oldRecord.spanKind && typeof oldRecord.spanKind === 'string') {
        kind = convertSpanKind(oldRecord.spanKind) as OTSpanKind;
    } else if (
        oldRecord.kind !== undefined &&
        oldRecord.kind !== null &&
        typeof oldRecord.kind === 'number'
    ) {
        kind = oldRecord.kind as OTSpanKind;
    } else {
        kind = OTSpanKind.INTERNAL;
    }

    // Convert times - prioritize old format (startTime/endTime), then new format
    let startTimeUnixNano: string;
    if (oldRecord.startTime && typeof oldRecord.startTime === 'string') {
        startTimeUnixNano = convertTimeToUnixNano(oldRecord.startTime);
    } else if (
        oldRecord.startTimeUnixNano &&
        typeof oldRecord.startTimeUnixNano === 'string'
    ) {
        startTimeUnixNano = oldRecord.startTimeUnixNano;
    } else {
        startTimeUnixNano = '0';
    }

    let endTimeUnixNano: string;
    if (oldRecord.endTime && typeof oldRecord.endTime === 'string') {
        endTimeUnixNano = convertTimeToUnixNano(oldRecord.endTime);
    } else if (
        oldRecord.endTimeUnixNano &&
        typeof oldRecord.endTimeUnixNano === 'string'
    ) {
        endTimeUnixNano = oldRecord.endTimeUnixNano;
    } else {
        endTimeUnixNano = '0';
    }

    // Convert latency - prioritize old format (latencyMs), then new format, else calculate
    let latencyNs: number;
    if (
        oldRecord.latencyMs !== null &&
        oldRecord.latencyMs !== undefined &&
        typeof oldRecord.latencyMs === 'number'
    ) {
        latencyNs = convertLatencyMsToNs(oldRecord.latencyMs);
    } else if (
        oldRecord.latencyNs !== null &&
        oldRecord.latencyNs !== undefined &&
        typeof oldRecord.latencyNs === 'number'
    ) {
        latencyNs = oldRecord.latencyNs;
    } else {
        latencyNs = getTimeDifferenceNano(startTimeUnixNano, endTimeUnixNano);
    }

    // Convert status - check if it's already JSON object or string
    let status: { code: number; message: string };
    const statusObj = oldRecord.status;
    if (
        typeof statusObj === 'object' &&
        statusObj !== null &&
        'code' in statusObj &&
        typeof (statusObj as { code?: unknown }).code === 'number'
    ) {
        // Already in new format (JSON object with code)
        status = statusObj as { code: number; message: string };
    } else {
        // Old format (string) - convert to JSON object
        const statusStr = typeof statusObj === 'string' ? statusObj : '';
        const statusMessage = oldRecord.statusMessage;
        status = convertStatus(
            statusStr,
            typeof statusMessage === 'string' ? statusMessage : undefined,
        );
    }

    // Convert events
    let events: SpanEvent[] = [];
    if (oldRecord.events) {
        let eventsArray: unknown[] = [];
        if (typeof oldRecord.events === 'string') {
            try {
                eventsArray = JSON.parse(oldRecord.events) as unknown[];
            } catch {
                eventsArray = [];
            }
        } else if (Array.isArray(oldRecord.events)) {
            eventsArray = oldRecord.events;
        }

        events = eventsArray.map((event: unknown) => {
            const eventObj = event as Record<string, unknown>;
            const timeUnixNano =
                eventObj.timestamp && typeof eventObj.timestamp === 'string'
                    ? encodeUnixNano(eventObj.timestamp)
                    : eventObj.timeUnixNano &&
                        typeof eventObj.timeUnixNano === 'string'
                        ? eventObj.timeUnixNano
                        : eventObj.time && typeof eventObj.time === 'string'
                            ? eventObj.time
                            : '0';
            return {
                name:
                    eventObj.name && typeof eventObj.name === 'string'
                        ? eventObj.name
                        : '',
                time: timeUnixNano,
                attributes: (eventObj.attributes &&
                    typeof eventObj.attributes === 'object' &&
                    eventObj.attributes !== null
                    ? (eventObj.attributes as Record<string, unknown>)
                    : {}) as SpanAttributes,
                droppedAttributesCount:
                    eventObj.droppedAttributesCount &&
                        typeof eventObj.droppedAttributesCount === 'number'
                        ? eventObj.droppedAttributesCount
                        : 0,
            };
        });
    }

    // Build resource from attributes
    const serviceName =
        getNestedValue(attributes, 'service.name') ||
        getNestedValue(attributes, 'project.service_name');
    const resourceAttributes: Record<string, unknown> = {};
    if (serviceName) {
        resourceAttributes['service.name'] = serviceName;
    }
    // Copy other resource-related attributes if any
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
    const resource: SpanResource = {
        attributes: resourceAttributes as SpanAttributes,
    };

    // Build scope
    const scope: SpanScope = {
        name: 'agentscope',
        version: '1.0.0',
        attributes: {},
    };

    // Get runId from attributes or record
    const runIdValue1 = getNestedValue(attributes, 'gen_ai.conversation.id');
    const runIdValue2 = getNestedValue(attributes, 'project.run_id');
    const runIdValue3 = oldRecord.runId;
    const runIdValue4 = oldRecord.run_id;
    const runId =
        (runIdValue1 !== undefined && runIdValue1 !== null
            ? String(runIdValue1)
            : undefined) ||
        (runIdValue2 !== undefined && runIdValue2 !== null
            ? String(runIdValue2)
            : undefined) ||
        (runIdValue3 !== undefined && runIdValue3 !== null
            ? String(runIdValue3)
            : undefined) ||
        (runIdValue4 !== undefined && runIdValue4 !== null
            ? String(runIdValue4)
            : undefined) ||
        'unknown';

    // Get spanId - in old data, the 'id' field maps to the new 'spanId'
    // Old table's primary key 'id' becomes new table's 'spanId'
    const idValue = oldRecord.id;
    const spanIdValue = oldRecord.spanId;
    const spanIdAttr1 = getNestedValue(attributes, 'span.id');
    const spanIdAttr2 = getNestedValue(attributes, 'spanId');
    const spanId =
        (idValue !== undefined && idValue !== null
            ? String(idValue)
            : undefined) ||
        (spanIdValue !== undefined && spanIdValue !== null
            ? String(spanIdValue)
            : undefined) ||
        (spanIdAttr1 !== undefined && spanIdAttr1 !== null
            ? String(spanIdAttr1)
            : undefined) ||
        (spanIdAttr2 !== undefined && spanIdAttr2 !== null
            ? String(spanIdAttr2)
            : undefined);

    // Ensure spanId is not null/undefined (it's used as primary key)
    if (!spanId) {
        throw new Error(
            `Cannot determine spanId for record. Record has no 'id' field: ${JSON.stringify(oldRecord)}`,
        );
    }

    // Build SpanData
    const traceIdValue = oldRecord.traceId;
    const traceStateValue = oldRecord.traceState;
    const parentSpanIdValue = oldRecord.parentSpanId;
    const flagsValue = oldRecord.flags;
    const spanData: SpanData = {
        traceId:
            traceIdValue !== undefined && traceIdValue !== null
                ? String(traceIdValue)
                : '',
        spanId: String(spanId),
        traceState:
            traceStateValue !== undefined && traceStateValue !== null
                ? String(traceStateValue)
                : undefined,
        parentSpanId:
            parentSpanIdValue !== undefined && parentSpanIdValue !== null
                ? String(parentSpanIdValue)
                : undefined,
        flags:
            flagsValue !== undefined &&
                flagsValue !== null &&
                typeof flagsValue === 'number'
                ? flagsValue
                : undefined,
        name: spanName,
        kind: kind,
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
                        // Note: oldRecord.id will become spanData.spanId, and we'll use spanId as the new primary key 'id'
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
