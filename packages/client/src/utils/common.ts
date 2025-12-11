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
    time: string | number | Date | bigint | null | undefined
): string => {
    if (!time) return '';
    try {
        // Handle bigint (nanoseconds to milliseconds)
        if (typeof time === 'bigint') {
            return dayjs(Number(time / BigInt(1_000_000))).format('YYYY-MM-DD HH:mm:ss');
        }
        
        // Handle string timestamps
        if (typeof time === 'string' && /^\d+$/.test(time)) {
            const numTime = BigInt(time);
            const timestamp = time.length > 13 
                ? Number(numTime / BigInt(1_000_000)) 
                : Number(numTime);
            return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
        }
        
        // Handle other types with dayjs
        return dayjs(time).format('YYYY-MM-DD HH:mm:ss');
    } catch {
        return '';
    }
};