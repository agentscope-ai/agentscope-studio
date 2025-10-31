import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Button, Flex, Tooltip, Upload, UploadFile } from 'antd';
import Lottie from 'lottie-react';

import DeleteIcon from '@/assets/svgs/delete.svg?react';
import ReplyBubble from '@/components/chat/bubbles/ReplyBubble';
import UserInputComponent from '@/components/chat/UserInput';
import ArrowDownIcon from '@/assets/svgs/arrow-down.svg?react';
import loadingData from '@/assets/lottie/loading.json';

import { RemoveScrollBarStyle } from '@/styles.ts';
import { useTranslation } from 'react-i18next';
import { useMessageApi } from '@/context/MessageApiContext.tsx';
import { BlockType, ContentBlocks, ReplyData } from '@shared/types';

import type { GetProp, UploadProps } from 'antd';
type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];

/**
 * Props for the main chat component that handles conversation display and user input.
 */
interface Props {
    replies: ReplyData[];
    isReplying: boolean;
    moreReplies: boolean;
    onUserInput: (blocksInput: ContentBlocks) => void;
    onInterruptReply: () => void;
    onCleanHistory: () => void;
    isCleaningHistory: boolean;
}

/**
 * Main chat component that displays conversation history and handles user input.
 * Supports text input, file attachments, and real-time message updates.
 */
const AppChatComponent = ({
    replies,
    onUserInput,
    isReplying,
    onInterruptReply,
    onCleanHistory,
    isCleaningHistory,
}: Props) => {
    const { t } = useTranslation();
    const [attachment, setAttachment] = useState<ContentBlocks>([]);
    const [inputText, setInputText] = useState<string>('');
    const [isAtBottom, setIsAtBottom] = useState<boolean>(false);
    const messageContainerRef = useRef<HTMLDivElement>(null);
    const { messageApi } = useMessageApi();

    // Check if there are any unfinished replies in the conversation
    const hasUnFinished = replies.some((reply) => !reply.finished);

    // Auto-scroll to bottom when new messages arrive and user is at bottom
    useEffect(() => {
        if (isAtBottom) {
            if (messageContainerRef.current) {
                messageContainerRef.current.scrollTop =
                    messageContainerRef.current.scrollHeight;
            }
        }
    }, [replies, isAtBottom]);

    /**
     * Handle sending user input (text + attachments) or interrupting current reply.
     * Combines text input with attachments into ContentBlocks format.
     */
    const sendUserInput = useCallback(() => {
        if (isReplying) {
            onInterruptReply();
            return;
        }
        const inputBlocks =
            inputText === ''
                ? attachment
                : ([
                      {
                          type: BlockType.TEXT,
                          text: inputText,
                      },
                      ...attachment,
                  ] as ContentBlocks);

        if (inputBlocks.length === 0) {
            messageApi.error(t('error.empty-input'));
        } else {
            onUserInput(inputBlocks);
            setInputText('');
            setAttachment([]);
        }
    }, [attachment, inputText, isReplying]);

    // File upload state
    const [fileList, setFileList] = useState<UploadFile[]>([]);

    /**
     * Convert file to base64 string for preview functionality.
     */
    const getBase64 = (file: FileType): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });

    /**
     * Handle file preview - convert to base64 if needed.
     * Note: Preview functionality is prepared but not fully implemented.
     */
    const handlePreview = async (file: UploadFile) => {
        if (!file.url && !file.preview) {
            file.preview = await getBase64(file.originFileObj as FileType);
        }
        // Preview modal implementation would go here
    };

    /**
     * Handle file list changes from upload component.
     */
    const handleChange: UploadProps['onChange'] = ({
        fileList: newFileList,
    }) => {
        setFileList(newFileList);
    };
    const uploadRef = useRef<any>(null);

    return (
        <Flex
            style={{
                height: '100%',
                width: '100%',
                padding: 16,
                justifyContent: 'flex-end',
            }}
            vertical={true}
            align={'center'}
            justify={'space-between'}
        >
            <Flex
                ref={messageContainerRef}
                style={{
                    width: '100%',
                    height: 0,
                    overflow: 'auto',
                    marginBottom: 8,
                    ...RemoveScrollBarStyle,
                }}
                vertical={true}
                flex={1}
                gap={'middle'}
                onScrollEnd={(e) => {
                    const target = e.target as HTMLDivElement;
                    // Check if user is near bottom (within 100px) to enable auto-scroll
                    const isAtBottom =
                        target.scrollHeight -
                            target.scrollTop -
                            target.clientHeight <
                        100;
                    setIsAtBottom(isAtBottom);
                }}
                align={'center'}
            >
                {replies.map((reply) => {
                    return (
                        <ReplyBubble
                            name={reply.name}
                            role={reply.role}
                            content={reply.content}
                            startTimeStamp={reply.startTimeStamp}
                            endTimeStamp={reply.endTimeStamp}
                            finished={reply.finished}
                        />
                    );
                })}
                {!hasUnFinished && isReplying ? (
                    <Lottie
                        animationData={loadingData}
                        loop={true}
                        autoplay={true}
                        style={{ width: 48 }}
                    />
                ) : null}
            </Flex>

            <Flex
                vertical={true}
                style={{ width: '100%', maxWidth: 'var(--chat-max-width)' }}
                gap={'small'}
                align={'center'}
            >
                <Flex
                    style={{ height: 32, width: '100%', position: 'relative' }}
                    justify={'center'}
                    vertical={false}
                >
                    <Tooltip title={t('tooltip.button.clean-history')}>
                        <Button
                            style={{ position: 'absolute', left: 0 }}
                            icon={<DeleteIcon width={13} height={13} />}
                            type={'dashed'}
                            disabled={isReplying}
                            loading={isCleaningHistory}
                            onClick={onCleanHistory}
                        >
                            {t('action.clean-history')}
                        </Button>
                    </Tooltip>

                    {/* Show scroll-to-bottom button when not at bottom and has messages */}
                    {isAtBottom || replies.length == 0 ? null : (
                        <Tooltip title={t('tooltip.button.scroll-to-bottom')}>
                            <Button
                                icon={
                                    <ArrowDownIcon
                                        width={18}
                                        height={18}
                                        style={{
                                            color: 'var(--muted-foreground)',
                                        }}
                                    />
                                }
                                size={'middle'}
                                shape={'circle'}
                                onClick={() => {
                                    if (messageContainerRef.current) {
                                        messageContainerRef.current.scrollTop =
                                            messageContainerRef.current.scrollHeight;
                                    }
                                }}
                            />
                        </Tooltip>
                    )}
                </Flex>

                <UserInputComponent
                    value={inputText}
                    onChange={setInputText}
                    attachmentChildren={
                        <Upload
                            name={'attachment'}
                            beforeUpload={() => false}
                            action={''}
                            listType={'picture'}
                            fileList={fileList}
                            onPreview={handlePreview}
                            onChange={handleChange}
                        >
                            <Button
                                ref={uploadRef}
                                style={{ display: 'none' }}
                            />
                        </Upload>
                    }
                    sendBtnLoading={isReplying}
                    sendBtnDisabled={
                        !isReplying &&
                        inputText === '' &&
                        attachment.length === 0
                    }
                    onSendClick={sendUserInput}
                    onAttachClick={() => uploadRef.current.click()}
                />
            </Flex>
        </Flex>
    );
};

export default memo(AppChatComponent);
