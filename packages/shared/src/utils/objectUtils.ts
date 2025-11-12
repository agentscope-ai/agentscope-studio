export function getNestedValue(
    obj: Record<string, any> | undefined,
    path: string | string[],
    separator: string = '.',
): any {
    if (!obj || typeof obj !== 'object') {
        return undefined;
    }

    const keys: string[] = Array.isArray(path)
        ? path.flatMap((k) => k.split(separator))
        : path.split(separator);

    return keys.reduce((acc, key) => acc?.[key], obj);
}

export function unflattenObject(
    flat: Record<string, any>,
): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(flat)) {
        const parts = key.split('.');
        let current = result;
        for (let i = 0; i < parts.length - 1; i++) {
            current[parts[i]] = current[parts[i]] || {};
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
    }
    return result;
}

export function flattenObject(
    obj: Record<string, any>,
    prefix = '',
): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(result, flattenObject(value, newKey));
        } else {
            result[newKey] = value;
        }
    }
    return result;
}

export function parseByMimeType(value: string, mime_type: string | undefined) {
    try {
        switch (mime_type) {
            case 'application/json':
                const jsonData = JSON.parse(value);
                return jsonData;
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
