import { ChangeEvent, memo, RefObject } from 'react';
import {
    AudioBlock,
    BlockType,
    ImageBlock,
    SourceType,
    VideoBlock,
} from '@shared/types';
import AudioFile from '@/assets/svgs/file-audio.svg?react';
import VideoFile from '@/assets/svgs/file-video.svg?react';
import UnknowFile from '@/assets/svgs/file-unknown.svg?react';
import { Image } from 'antd';
import { Button } from '@/components/ui/button.tsx';
import { XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type AttachBlock = ImageBlock | AudioBlock | VideoBlock;

interface Props {
    fileInputRef: RefObject<HTMLInputElement | null>;
    onAttach: (blocks: AttachData[]) => void;
    accept: string[];
    maxFileSize?: number;
    onError: (error: string) => void;
}

export const AttachInput = memo(
    ({
        fileInputRef,
        onAttach,
        accept,
        maxFileSize = 20 * 1024 * 1024, // Default max file size 20MB
        onError,
    }: Props) => {
        const fileToBase64 = (file: File): Promise<string> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (error) => reject(error);
            });
        };

        const getFileType = (
            mimeType: string,
        ): 'image' | 'audio' | 'video' | null => {
            const type = mimeType.split('/')[0];
            if (type === 'image' || type === 'audio' || type === 'video') {
                return type;
            }
            return null;
        };

        const handleFileSelect = async (
            event: ChangeEvent<HTMLInputElement>,
        ) => {
            const files = event.target.files;
            if (!files || files.length === 0) return;

            const newAttachments: AttachData[] = [];

            for (const file of Array.from(files)) {
                // Validate file size
                if (file.size > maxFileSize) {
                    onError(
                        `File ${file.name} exceeds the maximum size of ${maxFileSize / (1024 * 1024)} MB.`,
                    );
                    continue;
                }

                const fileType = getFileType(file.type);
                if (!fileType) {
                    onError(`Unsupported file type: ${file.type}`);
                    continue;
                }

                try {
                    const base64 = await fileToBase64(file);

                    // Create the appropriate block based on file type
                    const block: AttachBlock = {
                        type: fileType,
                        source: {
                            type: SourceType.BASE64,
                            media_type: file.type,
                            data: base64.split(',')[1],
                        },
                    } as AttachBlock;

                    newAttachments.push({
                        block: block,
                        fileName: file.name,
                        fileSize: file.size,
                    } as AttachData);
                } catch (e) {
                    onError(
                        `Failed to read file ${file.name}: ${(e as Error).message}`,
                    );
                }
            }

            if (newAttachments.length > 0) {
                onAttach(newAttachments);
            }

            // Reset the input to allow re-selection of the same files
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        };

        return (
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={accept.join(',')}
                onChange={handleFileSelect}
                className="hidden"
            />
        );
    },
);

export interface AttachData {
    block: AttachBlock;
    fileName: string;
    fileSize: number;
    onDelete: () => void;
}

export const AttachItem = memo(
    ({ block, fileName, fileSize, onDelete }: AttachData) => {
        const { t } = useTranslation();
        const deleteBtn = (
            <Button
                className="absolute -top-1.5 -right-2 h-4 w-4 rounded-full bg-white border border-border opacity-0 group-hover:opacity-100 transition-opacity z-10"
                size="icon"
                variant="ghost"
                onClick={onDelete}
            >
                <XIcon className="max-h-3 max-w-3" />
            </Button>
        );

        const wrapperClassName = 'group relative';
        const imageClassName =
            'h-14 w-14 border-border border rounded-[6px] hover:border-primary overflow-hidden [&_.ant-image]:h-full [&_.ant-image]:w-full [&_.ant-image-img]:rounded-[6px] [&_.ant-image-img]:object-cover';

        let srcString;
        if (block.type === BlockType.IMAGE) {
            if (block.source.type === SourceType.BASE64) {
                srcString = `data:${block.source.media_type};base64,${block.source.data}`;
            } else {
                srcString = block.source.url;
            }
            return (
                <div className={wrapperClassName}>
                    {deleteBtn}
                    <div className={imageClassName}>
                        <Image
                            className="!flex w-full h-full"
                            src={srcString}
                            preview={{
                                mask: (
                                    <div className="flex items-center justify-center">
                                        {t('common.preview')}
                                    </div>
                                ),
                            }}
                        />
                    </div>
                </div>
            );
        }

        const fileClassName = 'h-8 w-8 max-h-8 max-w-8 min-h-8 min-w-8';

        let fileSizeString;
        if (fileSize < 1024) {
            fileSizeString = `${fileSize} B`;
        } else if (fileSize < 1024 * 1024) {
            fileSizeString = `${Math.floor(fileSize / 1024)} KB`;
        } else if (fileSize < 1024 * 1024 * 1024) {
            fileSizeString = `${Math.floor(fileSize / (1024 * 1024))} MB`;
        } else {
            fileSizeString = `${Math.floor(fileSize / (1024 * 1024 * 1024))} GB`;
        }

        return (
            <div className="group relative flex flex-row items-center h-14 w-35 px-2 gap-x-2 border border-border rounded-[6px] hover:border-primary">
                {block.type === BlockType.AUDIO ? (
                    <AudioFile className={fileClassName} />
                ) : block.type === BlockType.VIDEO ? (
                    <VideoFile className={fileClassName} />
                ) : (
                    <UnknowFile className={fileClassName} />
                )}
                <div className="flex flex-col flex-1 min-w-0">
                    <div className="truncate text-sm text-primary">
                        {fileName}
                    </div>
                    <div className="truncate text-[12px] text-[rgb(26,26,29,0.25)]">
                        {fileSizeString}
                    </div>
                </div>

                {deleteBtn}
            </div>
        );
    },
);
