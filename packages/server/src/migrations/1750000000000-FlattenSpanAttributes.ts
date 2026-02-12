import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Attribute paths whose values are objects that should NOT be further flattened.
 *
 * These paths represent structured data (function inputs/outputs, tool call
 * arguments/results) that must be kept as-is.
 */
const PRESERVE_OBJECT_PATHS = new Set([
    'agentscope.function.input',
    'agentscope.function.output',
    'gen_ai.tool.call.arguments',
    'gen_ai.tool.call.result',
]);

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Parse a value that may be a JSON string or already an object into a
 * Record<string, unknown>.
 */
function parseAttributes(value: unknown): Record<string, unknown> {
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

/**
 * Detect whether the given attributes object uses a nested structure.
 *
 * Heuristic: if any top-level key does **not** contain a dot and its value is a
 * plain object (not an array / Uint8Array / null), we treat the whole
 * attributes object as nested.
 */
function isNestedStructure(attributes: Record<string, unknown>): boolean {
    if (!attributes || Object.keys(attributes).length === 0) {
        return false;
    }

    for (const [key, value] of Object.entries(attributes)) {
        if (
            !key.includes('.') &&
            value !== null &&
            typeof value === 'object' &&
            !Array.isArray(value)
        ) {
            return true;
        }
    }

    return false;
}

/**
 * Flatten a nested attributes object into dot-separated keys **while
 * preserving** certain paths whose values should remain as objects.
 *
 * Example:
 * ```
 * { agentscope: { function: { input: { args: [], kwargs: { msg: "hi" } } } } }
 * // becomes
 * { "agentscope.function.input": { args: [], kwargs: { msg: "hi" } } }
 * ```
 */
function flattenAttributes(
    attributes: Record<string, unknown>,
): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    function recurse(obj: Record<string, unknown>, prefix: string): void {
        for (const [key, value] of Object.entries(obj)) {
            const currentPath = prefix ? `${prefix}.${key}` : key;

            // If we hit a preserved path, store the whole value and stop.
            if (PRESERVE_OBJECT_PATHS.has(currentPath)) {
                result[currentPath] = value;
                continue;
            }

            if (
                value !== null &&
                typeof value === 'object' &&
                !Array.isArray(value)
            ) {
                // Continue flattening nested objects.
                recurse(value as Record<string, unknown>, currentPath);
            } else {
                // Primitive / array – store directly.
                result[currentPath] = value;
            }
        }
    }

    recurse(attributes, '');
    return result;
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

const BATCH_SIZE = 1000;

/**
 * Migration: Flatten nested span attributes to dot-separated keys.
 *
 * Existing spans stored with nested attribute objects (e.g.
 * `{ gen_ai: { operation: { name: "chat" } } }`) are converted to flat keys
 * (`{ "gen_ai.operation.name": "chat" }`).
 *
 * Certain attribute paths whose values are meaningful objects
 * (agentscope.function.input/output, gen_ai.tool.call.arguments/result) are
 * preserved as-is and not recursively flattened.
 */
export class FlattenSpanAttributes1750000000000 implements MigrationInterface {
    name = 'FlattenSpanAttributes1750000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log(
            'Starting migration: Flattening span attributes to dot-separated keys...',
        );

        // ========================================
        // Step 1: Check if table exists
        // ========================================
        const tableName = 'span_table';

        if (!(await queryRunner.hasTable(tableName))) {
            console.log(
                '⏭️  span_table does not exist. Skipping migration (first-time installation).',
            );
            return;
        }

        // ========================================
        // Step 2: Count total rows with non-empty attributes
        // ========================================
        const countResult: { count: number }[] = await queryRunner.query(
            `SELECT COUNT(*) as count FROM ${tableName} WHERE attributes IS NOT NULL AND attributes != '{}'`,
        );
        const totalCount = countResult[0]?.count ?? 0;

        if (totalCount === 0) {
            console.log('No spans with attributes found. Nothing to migrate.');
            return;
        }

        console.log(
            `Found ${totalCount} spans with non-empty attributes to inspect.`,
        );

        // ========================================
        // Step 3: Batch process
        // ========================================
        let offset = 0;
        let totalUpdated = 0;

        while (offset < totalCount) {
            const rows: { id: string; attributes: unknown }[] =
                await queryRunner.query(
                    `SELECT id, attributes FROM ${tableName} WHERE attributes IS NOT NULL AND attributes != '{}' LIMIT ${BATCH_SIZE} OFFSET ${offset}`,
                );

            if (rows.length === 0) break;

            for (const row of rows) {
                const attributes = parseAttributes(row.attributes);

                if (!isNestedStructure(attributes)) {
                    continue;
                }

                const flattened = flattenAttributes(attributes);

                await queryRunner.query(
                    `UPDATE ${tableName} SET attributes = ? WHERE id = ?`,
                    [JSON.stringify(flattened), row.id],
                );

                totalUpdated++;
            }

            offset += BATCH_SIZE;

            const progress = Math.min(offset, totalCount);
            console.log(
                `  Progress: ${progress}/${totalCount} inspected, ${totalUpdated} updated so far.`,
            );
        }

        console.log(
            `✅ Migration completed. Flattened attributes of ${totalUpdated} spans.`,
        );
    }

    public async down(): Promise<void> {
        console.log(
            '⚠️  Rollback not supported for FlattenSpanAttributes: cannot uniquely reconstruct nested structure.',
        );
        console.log(
            '   If rollback is needed, restore from a database backup.',
        );
    }
}
