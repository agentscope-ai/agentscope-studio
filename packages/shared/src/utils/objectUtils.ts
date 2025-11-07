export function getNestedValue(
    obj: Record<string, unknown> | undefined,
    path: string | string[],
    separator: string = '.',
): unknown {
    if (!obj || typeof obj !== 'object') {
        return undefined;
    }

    const keys: string[] = Array.isArray(path)
        ? path.flatMap((k) => k.split(separator))
        : path.split(separator);

    return keys.reduce<unknown>((acc, key) => {
        if (acc && typeof acc === 'object' && key in acc) {
            return (acc as Record<string, unknown>)[key];
        }
        return undefined;
    }, obj);
}

export function unflattenObject(
    flat: Record<string, unknown>,
): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(flat)) {
        const parts = key.split('.');
        let current: Record<string, unknown> = result;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
                current[parts[i]] = {};
            }
            current = current[parts[i]] as Record<string, unknown>;
        }
        current[parts[parts.length - 1]] = value;
    }
    return result;
}

export function flattenObject(
    obj: Record<string, unknown>,
    prefix = '',
): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (
            value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            value !== null
        ) {
            Object.assign(
                result,
                flattenObject(value as Record<string, unknown>, newKey),
            );
        } else {
            result[newKey] = value;
        }
    }
    return result;
}

export function parseByMimeType(
    value: string,
    mime_type: string | undefined,
): unknown {
    try {
        switch (mime_type) {
            case 'application/json': {
                const jsonData = JSON.parse(value);
                return jsonData;
            }
            default:
                return value;
        }
    } catch {
        return value;
    }
}

export const objectUtils = {
    getNestedValue,
    flattenObject,
    unflattenObject,
    parseByMimeType,
};

export default objectUtils;
