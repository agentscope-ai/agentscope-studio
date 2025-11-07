 
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
    let current: unknown = obj;
    for (const key of keys) {
        if (current && typeof current === 'object') {
            current = (current as Record<string, unknown>)[key];
        } else {
            return undefined;
        }
    }
    return current;
}

export function unflattenObject(
    flat: Record<string, unknown>,
): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(flat)) {
        const parts = key.split('.');
        let current: Record<string, unknown> = result;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part] || typeof current[part] !== 'object') {
                current[part] = {};
            }
            current = current[part] as Record<string, unknown>;
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
