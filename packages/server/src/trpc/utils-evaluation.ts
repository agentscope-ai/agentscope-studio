

export const verifyMetadataByVersion = (metadata: object) => {
    if (!('schema_version' in metadata)) {
        throw new Error('Missing schema_version in metadata');
    }
    const version = metadata['schema_version'];
    if (version === 1) {
        _verifyMetadataV1(metadata);
    } else {
        throw new Error(`Unsupported metadata version: ${version}`);
    }
}

/**
 * Verify metadata for version 1
 *
 * The v1 metadata should contain:
 * - evaluation_name
 * - created_at
 * - total_repeats
 * - benchmark
 *  - name
 *  - description
 *  - total_tasks
 * - schema_version
 *
 * @param metadata
 */
const _verifyMetadataV1 = (metadata: Record<string, unknown>) => {
    const requiredFields = [
        'evaluation_name',
        'created_at',
        'total_repeats',
        'benchmark',
        'schema_version',
    ];

    for (const field of requiredFields) {
        if (!(field in metadata)) {
            throw new Error(`Missing required field: ${field}`);
        }
    }

    const requiredBenchmarkFields = [
        'name',
        'description',
        // 'total_tasks',
    ];

    // First check if benchmark is an object
    if (typeof metadata['benchmark'] !== 'object' || metadata['benchmark'] === null) {
        throw new Error('Benchmark field must be a non-null object');
    }
    // Check benchmark fields
    for (const field of requiredBenchmarkFields) {
        if (!(field in metadata['benchmark'])) {
            throw new Error(`Missing required benchmark field: ${field}`);
        }
    }
}