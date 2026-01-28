import { memo, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderIcon, UploadIcon, Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Props {
    onUpload: (files: Array<{ relativePath: string; content: string }>) => Promise<void>;
    uploading?: boolean;
}

const FolderUploader = ({ onUpload, uploading = false }: Props) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [fileCount, setFileCount] = useState<number>(0);
    const [uploadProgress, setUploadProgress] = useState<number>(0);

    // Convert File to base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    // Remove data URL prefix (e.g., "data:application/json;base64,")
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                } else {
                    reject(new Error('Failed to read file'));
                }
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleFolderSelect = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (!files || files.length === 0) return;

            // Get folder name from first file's path
            const firstFile = files[0];
            const pathParts = firstFile.webkitRelativePath.split('/');
            const folderName = pathParts[0];

            setSelectedFolder(folderName);
            setFileCount(files.length);
            setUploadProgress(0);

            try {
                // Convert all files to base64
                const fileDataPromises = Array.from(files).map(async (file, index) => {
                    const base64Content = await fileToBase64(file);
                    setUploadProgress(Math.round(((index + 1) / files.length) * 100));
                    return {
                        relativePath: file.webkitRelativePath.substring(
                            folderName.length + 1,
                        ), // Remove folder name from path
                        content: base64Content,
                    };
                });

                const fileData = await Promise.all(fileDataPromises);

                // Call onUpload with the file data
                await onUpload(fileData);

                // Reset after successful upload
                setSelectedFolder(null);
                setFileCount(0);
                setUploadProgress(0);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            } catch (error) {
                console.error('Failed to process files:', error);
                setUploadProgress(0);
            }
        },
        [onUpload],
    );

    const handleButtonClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    return (
        <div className="flex flex-col items-center justify-center gap-6 p-8 border-2 border-dashed rounded-lg hover:border-primary transition-colors">
            <input
                ref={fileInputRef}
                type="file"
                // @ts-ignore - webkitdirectory is not in TypeScript types but is widely supported
                webkitdirectory=""
                directory=""
                multiple
                onChange={handleFolderSelect}
                style={{ display: 'none' }}
                disabled={uploading}
            />

            <FolderIcon className="size-16 text-muted-foreground" />

            <div className="text-center space-y-2">
                <p className="text-lg font-medium">
                    {t('hint.upload-evaluation-folder')}
                </p>
                <p className="text-sm text-muted-foreground">
                    {t('hint.upload-folder-description')}
                </p>
            </div>

            {selectedFolder && (
                <div className="w-full max-w-md space-y-2">
                    <p className="text-sm text-muted-foreground">
                        {t('hint.selected-folder')}: <strong className="font-semibold text-foreground">{selectedFolder}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {t('hint.file-count')}: <strong className="font-semibold text-foreground">{fileCount}</strong>
                    </p>
                    {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="space-y-1">
                            <Progress value={uploadProgress} className="h-2" />
                            <p className="text-xs text-muted-foreground text-right">
                                {uploadProgress}%
                            </p>
                        </div>
                    )}
                </div>
            )}

            <Button
                onClick={handleButtonClick}
                disabled={uploading}
                size="lg"
                className="gap-2"
            >
                {uploading ? (
                    <>
                        <Loader2Icon className="size-4 animate-spin" />
                        {t('action.uploading')}
                    </>
                ) : (
                    <>
                        <UploadIcon className="size-4" />
                        {t('action.select-folder')}
                    </>
                )}
            </Button>

            <p className="text-xs text-muted-foreground">
                {t('hint.folder-must-contain-meta')}
            </p>
        </div>
    );
};

export default memo(FolderUploader);
