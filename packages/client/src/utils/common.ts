import { BlockType } from '@shared/types';
import dayjs from 'dayjs';
/**
 * Copy a string to the system clipboard.
 *
 * @param text The text content to copy.
 * @returns A promise that resolves to true if the copy succeeds; false otherwise.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy text: ', err);
        return false;
    }
};

/**
 * Infer content block type from a file extension.
 *
 * @param extension File extension without leading dot (e.g. "png", "mp3").
 * @returns Corresponding BlockType for image/audio/video; null if unknown or undefined.
 */
export const getBlockTypeFromExtension = (extension: string | undefined) => {
    const imagesExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
    const audioExt = ['mp3', 'wav', 'aiff', 'aac', 'ogg', 'flac'];
    const videoExt = [
        'mp4',
        'mpeg',
        'mov',
        'avi',
        'x-flv',
        'mpg',
        'webm',
        'wmv',
        '3gpp',
    ];

    if (extension === undefined) {
        return null;
    }

    if (imagesExt.includes(extension)) {
        return BlockType.IMAGE;
    }
    if (audioExt.includes(extension)) {
        return BlockType.AUDIO;
    }
    if (videoExt.includes(extension)) {
        return BlockType.VIDEO;
    }

    return null;
};
/**
 * Universal datetime formatter supporting multiple input types
 *
 * @param time - Input time in various formats
 * @returns Formatted datetime string or empty string
 */
export const formatDateTime = (
    time: string | number | Date | bigint | null | undefined,
): string => {
    if (!time) return '';
    try {
        // Handle bigint (nanoseconds to milliseconds)
        if (typeof time === 'bigint') {
            return dayjs(Number(time / BigInt(1_000_000))).format(
                'YYYY-MM-DD HH:mm:ss',
            );
        }

        // Handle string timestamps
        if (typeof time === 'string' && /^\d+$/.test(time)) {
            const numTime = BigInt(time);
            let timestamp: number;
            // Convert to milliseconds based on the length of the timestamp string
            if (time.length <= 10) {
                // Seconds (10 digits or less)
                timestamp = Number(numTime) * 1000;
            } else if (time.length <= 13) {
                // Milliseconds (11-13 digits)
                timestamp = Number(numTime);
            } else if (time.length <= 16) {
                // Microseconds (14-16 digits)
                timestamp = Number(numTime / BigInt(1000));
            } else if (time.length <= 19) {
                // Nanoseconds (17-19 digits)
                timestamp = Number(numTime / BigInt(1000000));
            } else {
                // Too long, assume it's nanoseconds and convert accordingly
                timestamp = Number(numTime / BigInt(1000000));
            }
            return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
        }

        // Handle other types with dayjs
        return dayjs(time).format('YYYY-MM-DD HH:mm:ss');
    } catch {
        return '';
    }
};

/**
 * Format a number into a human-readable string with appropriate formatting
 *
 * @param num - The number to format (can be number, string, bigint, null, or undefined)
 * @param digits - The number of decimal places to show (default: 2)
 * @returns Formatted string representation of the number
 */
export const formatNumber = (
    num?: number | string | bigint | null | undefined,
    digits: number = 2,
): string => {
    // Handle null/undefined cases
    if (num == null) return '';

    // Convert to number
    let number: number;
    if (typeof num === 'bigint') {
        number = Number(num);
    } else if (typeof num === 'string') {
        // Fast path for empty strings
        if (num === '') return '';
        number = parseFloat(num);
    } else {
        number = num;
    }

    // Handle invalid numbers
    if (!isFinite(number)) return '';

    // Helper function to remove trailing zeros
    const removeTrailingZeros = (str: string): string => {
        return str.replace(/\.?0+$/, '');
    };
    // For small numbers (< 1000), show as-is with specified decimal places if needed
    if (Math.abs(number) < 1000) {
        // For integers, show as-is without decimal places
        if (Number.isInteger(number)) {
            return number.toString();
        }

        // For non-integers, format with specified digits and remove trailing zeros
        const formatted = number.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: digits,
        });

        return removeTrailingZeros(formatted);
    }
    // For medium numbers (1000-9999), add thousand separators
    if (Math.abs(number) < 10000) {
        // For integers, show with thousand separators but no decimal places
        if (Number.isInteger(number)) {
            return number.toLocaleString(undefined);
        }
        // For non-integers, format with specified digits and remove trailing zeros
        const formatted = number.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: digits,
        });

        return removeTrailingZeros(formatted);
    }
    // For large numbers (>= 10000), abbreviate with units
    const units: [number, string][] = [
        [1e12, 'T'], // Trillion
        [1e9, 'B'], // Billion
        [1e6, 'M'], // Million
        [1e3, 'K'], // Thousand
    ];

    // Find appropriate unit
    for (let i = 0; i < units.length; i++) {
        const [value, symbol] = units[i];
        if (Math.abs(number) >= value) {
            const scaled = number / value;

            // For integers, don't show decimal places
            if (Number.isInteger(scaled)) {
                return scaled.toLocaleString(undefined) + symbol;
            }

            // Format with specified digits and remove trailing zeros
            const formatted = scaled.toLocaleString(undefined, {
                minimumFractionDigits: digits,
                maximumFractionDigits: digits,
            });

            return removeTrailingZeros(formatted) + symbol;
        }
    }

    // Fallback - should not normally reach here
    return number.toString();
};

/**
 * Format a duration in seconds into a human-readable string with appropriate units.
 * Converts seconds to milliseconds for values less than 1 second.
 *
 * @param seconds - The duration in seconds to format
 * @returns Formatted string with unit (e.g., "500.00ms" or "2.50s")
 */
export const formatDurationWithUnit = (seconds: number): string => {
    if (seconds < 1) {
        return `${(seconds * 1000).toFixed(2)}ms`;
    }
    return `${seconds.toFixed(2)}s`;
};

/**
 * Format a duration in seconds into a numeric value with appropriate scaling.
 * Converts seconds to milliseconds for values less than 1 second.
 *
 * @param seconds - The duration in seconds to format
 * @returns Formatted number (in milliseconds if < 1 second, otherwise in seconds)
 */
export const formatDuration = (seconds: number): number => {
    if (seconds < 1) {
        return parseFloat((seconds * 1000).toFixed(2));
    }
    return parseFloat(seconds.toFixed(2));
};
