import { memo, ReactNode, RefObject, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Button,
    type GetProp,
    Input,
    Upload,
    UploadFile,
    type UploadProps,
} from 'antd';
import { PrimaryButton, SecondaryButton } from '@/components/buttons/ASButton';
import AttachSvg from '@/assets/svgs/attachment.svg?react';
import InterruptSvg from '@/assets/svgs/interrupt.svg?react';
import EnterSvg from '@/assets/svgs/enter.svg?react';
import {
    AudioBlock,
    BlockType,
    ContentBlocks,
    ImageBlock,
    VideoBlock,
} from '@shared/types';
import { useMessageApi } from '@/context/MessageApiContext';

interface Props {
    placeholder: string;
    isReplying: boolean;
    sendTooltip: string;
    sendUserInput: (content: ContentBlocks) => void;
    sendAllowed: boolean;
    onInterrupt?: () => void;
    actions?: ReactNode;
    textAreaRef?: RefObject<HTMLInputElement | null>;
}

type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];

const fileToBase64 = (file: FileType): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });

const fileToBlock = async (file: UploadFile) => {
    const base64Data = await fileToBase64(file.originFileObj as FileType);
    // const extension = file.name.split('.').at(-1);
    // const blockType = getBlockTypeFromExtension(extension);

    const media_type = base64Data.split(';')[0].split(':')[1];
    const blockType = media_type.split('/')[0];
    const data = base64Data.split('base64,').at(-1);
    return {
        type: blockType,
        source: {
            type: 'base64',
            media_type: media_type,
            data: data,
        },
    } as ImageBlock | VideoBlock | AudioBlock;
};

const UnifiedUserInput = ({
    placeholder,
    isReplying,
    sendTooltip,
    sendUserInput,
    sendAllowed,
    onInterrupt,
    actions,
    textAreaRef,
}: Props) => {
    const { t } = useTranslation();
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [text, setText] = useState<string>('');
    const uploadRef = useRef<unknown>(null);
    const { messageApi } = useMessageApi();

    const sendIcon =
        isReplying && onInterrupt ? (
            <InterruptSvg width={13} height={13} />
        ) : (
            <EnterSvg width={15} height={15} />
        );

    const onSendClick = async () => {
        const content: ContentBlocks = [];
        // text
        if (text.length !== 0) {
            content.push({
                type: BlockType.TEXT,
                text: text,
            });
        }
        // attachments
        await Promise.all(
            fileList.map(async (file) => {
                const block = await fileToBlock(file);
                content.push(block);
            }),
        );

        // check
        if (content.length === 0) {
            messageApi.error(t('error.empty-input'));
            return;
        }

        sendUserInput(content);
        // clear
        setText('');
        setFileList([]);
    };

    return (
        <div
            ref={textAreaRef}
            className="flex flex-col w-full border border-border shadow rounded-[8px] p-2 mt-auto"
        >
            <Upload
                name={'attachment'}
                beforeUpload={() => false}
                listType={'picture'}
                fileList={fileList}
                onChange={({ fileList: newFileList }) => {
                    setFileList(newFileList);
                }}
            >
                <Button ref={uploadRef} className="hidden" />
            </Upload>

            <Input.TextArea
                variant={'borderless'}
                placeholder={placeholder}
                draggable={false}
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={async (e) => {
                    if (e.key === 'Enter' && e.metaKey) {
                        await onSendClick();
                    }
                }}
            />

            <div className="flex flex-rowmt-2 items-center justify-between">
                <div>{actions}</div>

                <div className="flex flex-row gap-2 items-center">
                    <SecondaryButton
                        tooltip={t('tooltip.button.attachment-add')}
                        icon={<AttachSvg width={15} height={15} />}
                        onClick={() => uploadRef.current?.click()}
                    />
                    <PrimaryButton
                        tooltip={sendTooltip}
                        icon={sendIcon}
                        disabled={!sendAllowed || (isReplying && !onInterrupt)}
                        onClick={onSendClick}
                    />
                </div>
            </div>
        </div>
    );
};

export default memo(UnifiedUserInput);
