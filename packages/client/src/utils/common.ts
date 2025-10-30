import { BlockType } from '@shared/types';
import { clsx, type ClassValue } from 'clsx';

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
 * Utility function for combining class names.
 * This is a common pattern in shadcn/ui components.
 *
 * @param inputs Class values to combine
 * @returns Combined class string
 */
export const cn = (...inputs: ClassValue[]) => {
    return clsx(inputs);
};
