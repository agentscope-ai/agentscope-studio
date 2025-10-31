import { SpanKind as OTSpanKind } from '@opentelemetry/api';
import { DataSource } from 'typeorm';
import { OldSpanKind, SpanData, SpanEvent, SpanLink, SpanResource, SpanScope } from '../../../shared/src/types/trace';
import { getNestedValue } from '../../../shared/src/utils/objectUtils';
import { encodeUnixNano, getTimeDifferenceNano } from '../../../shared/src/utils/timeUtils';
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
function convertStatus(status: string, statusMessage?: string): { code: number; message: string } {
    const statusMap: Record<string, number> = {
        'OK': 1,
        'ERROR': 2,
        'UNSET': 0,
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
function convertOldRecordToSpanData(oldRecord: any): SpanData {
    // Parse attributes
    let attributes: Record<string, unknown> = {};
    if (typeof oldRecord.attributes === 'string') {
        try {
            attributes = JSON.parse(oldRecord.attributes);
        } catch {
            attributes = {};
        }
    } else if (oldRecord.attributes) {
        attributes = oldRecord.attributes;
    }

    // Convert old protocol attributes to new format using processor logic
    const mockSpan = { name: oldRecord.name || '' };
    const convertedResult = SpanProcessor.convertOldProtocolToNew(attributes, mockSpan);
    const spanName = convertedResult.span_name || oldRecord.name || '';
    attributes = convertedResult.attributes || attributes;

    // Convert spanKind to OpenTelemetry SpanKind number
    // Try old format first (spanKind as string), then new format (kind as number)
    let kind: OTSpanKind;
    if (oldRecord.spanKind) {
        kind = convertSpanKind(oldRecord.spanKind) as OTSpanKind;
    } else if (oldRecord.kind !== undefined && oldRecord.kind !== null) {
        kind = oldRecord.kind as OTSpanKind;
    } else {
        kind = OTSpanKind.INTERNAL;
    }

    // Convert times - prioritize old format (startTime/endTime), then new format
    let startTimeUnixNano: string;
    if (oldRecord.startTime) {
        startTimeUnixNano = convertTimeToUnixNano(oldRecord.startTime);
    } else if (oldRecord.startTimeUnixNano) {
        startTimeUnixNano = oldRecord.startTimeUnixNano;
    } else {
        startTimeUnixNano = '0';
    }

    let endTimeUnixNano: string;
    if (oldRecord.endTime) {
        endTimeUnixNano = convertTimeToUnixNano(oldRecord.endTime);
    } else if (oldRecord.endTimeUnixNano) {
        endTimeUnixNano = oldRecord.endTimeUnixNano;
    } else {
        endTimeUnixNano = '0';
    }

    // Convert latency - prioritize old format (latencyMs), then new format, else calculate
    let latencyNs: number;
    if (oldRecord.latencyMs !== null && oldRecord.latencyMs !== undefined) {
        latencyNs = convertLatencyMsToNs(oldRecord.latencyMs);
    } else if (oldRecord.latencyNs !== null && oldRecord.latencyNs !== undefined) {
        latencyNs = oldRecord.latencyNs;
    } else {
        latencyNs = getTimeDifferenceNano(startTimeUnixNano, endTimeUnixNano);
    }

    // Convert status - check if it's already JSON object or string
    let status: { code: number; message: string };
    if (typeof oldRecord.status === 'object' && oldRecord.status !== null && oldRecord.status.code !== undefined) {
        // Already in new format (JSON object with code)
        status = oldRecord.status;
    } else {
        // Old format (string) - convert to JSON object
        const statusStr = typeof oldRecord.status === 'string' ? oldRecord.status : '';
        status = convertStatus(statusStr, oldRecord.statusMessage);
    }

    // Convert events
    let events: SpanEvent[] = [];
    if (oldRecord.events) {
        let eventsArray: any[] = [];
        if (typeof oldRecord.events === 'string') {
            try {
                eventsArray = JSON.parse(oldRecord.events);
            } catch {
                eventsArray = [];
            }
        } else if (Array.isArray(oldRecord.events)) {
            eventsArray = oldRecord.events;
        }

        events = eventsArray.map((event: any) => {
            const timeUnixNano = event.timestamp ? encodeUnixNano(event.timestamp) :
                (event.timeUnixNano || event.time || '0');
            return {
                name: event.name || '',
                time: timeUnixNano,
                attributes: event.attributes || {},
                droppedAttributesCount: event.droppedAttributesCount || 0,
            };
        });
    }

    // Build resource from attributes
    const serviceName = getNestedValue(attributes, 'service.name') || getNestedValue(attributes, 'project.service_name');
    const resourceAttributes: Record<string, unknown> = {};
    if (serviceName) {
        resourceAttributes['service.name'] = serviceName;
    }
    // Copy other resource-related attributes if any
    const resourceKeys = ['service.namespace', 'service.version', 'service.instance.id'];
    for (const key of resourceKeys) {
        const value = getNestedValue(attributes, key);
        if (value !== undefined) {
            resourceAttributes[key] = value;
        }
    }
    const resource: SpanResource = {
        attributes: resourceAttributes as any,
    };

    // Build scope
    const scope: SpanScope = {
        name: 'agentscope',
        version: '1.0.0',
        attributes: {},
    };

    // Get runId from attributes or record
    const runId = getNestedValue(attributes, 'gen_ai.conversation.id') ||
        getNestedValue(attributes, 'project.run_id') ||
        oldRecord.runId ||
        oldRecord.run_id ||
        'unknown';

    // Get spanId - in old data, the 'id' field maps to the new 'spanId'
    // Old table's primary key 'id' becomes new table's 'spanId'
    const spanId = oldRecord.id ||
        oldRecord.spanId ||
        getNestedValue(attributes, 'span.id') ||
        getNestedValue(attributes, 'spanId');

    // Ensure spanId is not null/undefined (it's used as primary key)
    if (!spanId) {
        throw new Error(`Cannot determine spanId for record. Record has no 'id' field: ${JSON.stringify(oldRecord)}`);
    }

    // Build SpanData
    const spanData: SpanData = {
        traceId: oldRecord.traceId || '',
        spanId: String(spanId),
        traceState: oldRecord.traceState || undefined,
        parentSpanId: oldRecord.parentSpanId || undefined,
        flags: oldRecord.flags || undefined,
        name: spanName,
        kind: kind,
        startTimeUnixNano: startTimeUnixNano,
        endTimeUnixNano: endTimeUnixNano,
        attributes: attributes as any,
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
            console.log('[Migration] span_table does not exist, skipping migration.');
            await queryRunner.commitTransaction();
            transactionActive = false;
            return;
        }

        // Get table structure to check which columns exist
        const table = await queryRunner.getTable(tableName);
        if (!table) {
            console.log('[Migration] Cannot get table structure, skipping migration.');
            await queryRunner.commitTransaction();
            transactionActive = false;
            return;
        }

        // Check if table has the new structure (has spanId column)
        const hasSpanIdColumn = table.findColumnByName('spanId') !== undefined;
        const hasInstrumentationVersion = table.findColumnByName('instrumentationVersion') !== undefined;

        // If table already has the new structure, skip migration
        if (hasSpanIdColumn && hasInstrumentationVersion) {
            console.log('[Migration] Table already has new structure, skipping migration.');
            await queryRunner.commitTransaction();
            transactionActive = false;
            return;
        }

        // Step 1: Drop views that depend on span_table to avoid dependency issues
        const viewName = 'model_invocation_view';
        const viewExists = await queryRunner.hasTable(viewName);
        if (viewExists) {
            console.log(`[Migration] Dropping view ${viewName} before migration...`);
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
            [viewName]
        );
        if (viewStillExists.length > 0) {
            console.log(`[Migration] Warning: View ${viewName} still exists after drop, trying to drop again...`);
            await queryRunner.query(`DROP VIEW IF EXISTS ${viewName}`);
        }

        // Step 4: Start new transaction for table rename
        await queryRunner.startTransaction();
        transactionActive = true;

        // Step 5: Backup old table by renaming it using raw SQL to avoid TypeORM's view checking
        oldTableName = 'span_table_old_backup';
        console.log(`[Migration] Renaming old table to ${oldTableName}...`);
        // Use raw SQL ALTER TABLE RENAME instead of TypeORM's renameTable to avoid view dependency checks
        await queryRunner.query(`ALTER TABLE "${tableName}" RENAME TO "${oldTableName}"`);

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
            const newQueryRunner = migrationDataSourceWithSync.createQueryRunner();
            await newQueryRunner.connect();
            await newQueryRunner.startTransaction();

            try {
                // Step 9: Get all records from the old table (using original queryRunner)
                const oldRecords = await queryRunner.query(`SELECT * FROM ${oldTableName}`);

                if (oldRecords.length === 0) {
                    console.log('[Migration] No records found, dropping old table.');
                    await newQueryRunner.dropTable(oldTableName);
                    await newQueryRunner.commitTransaction();
                    await newQueryRunner.release();
                    return;
                }

                console.log(`[Migration] Found ${oldRecords.length} records to migrate.`);

                // Step 10: Convert old records to SpanData and batch process
                let migratedCount = 0;
                let skippedCount = 0;
                let errorCount = 0;
                const spanDataArray: SpanTable[] = [];
                const spanRepository = migrationDataSourceWithSync.getRepository(SpanTable);

                for (const oldRecord of oldRecords) {
                    try {
                        // Validate that old record has an id (primary key from old table)
                        if (!oldRecord.id) {
                            console.error(`[Migration] Record missing 'id' field, skipping:`, Object.keys(oldRecord));
                            errorCount++;
                            continue;
                        }

                        // Convert old record to SpanData
                        // Note: oldRecord.id will become spanData.spanId, and we'll use spanId as the new primary key 'id'
                        const spanData = convertOldRecordToSpanData(oldRecord);

                        // Create SpanTable instance manually (similar to SpanDao.saveSpans logic)
                        // Extract key fields for indexing
                        const serviceName = getNestedValue(spanData.resource.attributes, 'service.name');
                        const operationName = getNestedValue(spanData.attributes, 'gen_ai.operation.name');
                        // Use scope.name and scope.version directly (per SpanTable comments),
                        // but fallback to attributes for backward compatibility
                        const instrumentationName = spanData.scope.name ||
                            getNestedValue(spanData.scope.attributes || {}, 'server.name');
                        const instrumentationVersion = spanData.scope.version ||
                            getNestedValue(spanData.scope.attributes || {}, 'server.version');
                        const model = getNestedValue(spanData.attributes, 'gen_ai.request.model');
                        const inputTokens = getNestedValue(spanData.attributes, 'gen_ai.usage.input_tokens');
                        const outputTokens = getNestedValue(spanData.attributes, 'gen_ai.usage.output_tokens');

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
                            droppedAttributesCount: spanData.droppedAttributesCount,
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
                            console.log(`[Migration] Progress: ${migratedCount}/${oldRecords.length} records migrated...`);
                            spanDataArray.length = 0; // Clear array
                        }
                    } catch (error) {
                        console.error(`[Migration] Error converting record with id: ${oldRecord.id || 'unknown'}`, error);
                        if (error instanceof Error) {
                            console.error(`[Migration] Error message: ${error.message}`);
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
                        console.error('[Migration] Error saving final batch:', error);
                        errorCount += spanDataArray.length;
                    }
                }

                console.log(`[Migration] Migration completed. Migrated: ${migratedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);

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
                console.error('[Migration] Error during rollback:', rollbackError);
            }
        }
        throw error;
    } finally {
        await queryRunner.release();
    }
}
