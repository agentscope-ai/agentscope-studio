import { memo, useEffect, useRef, useState } from 'react';
import { Avatar, Flex, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { isMacOs } from 'react-device-detect';

import MessageBubble from '@/components/chat/bubbles/MessageBubble';
import MarkdownIcon from '@/assets/svgs/markdown.svg?react';
import CheckCircleIcon from '@/assets/svgs/check-circle.svg?react';
import UnifiedUserInput from '@/components/chat/UnifiedUserInput';

import { RemoveScrollBarStyle } from '@/styles.ts';
import { SwitchButton } from '../../buttons/ASButton';
import { useTour } from '@/context/TourContext.tsx';
import { ContentBlocks, MessageData, InputRequestData } from '@shared/types';

import './index.css';

interface Props {
    messages: MessageData[];
    onMsgBubbleClick: (msg: MessageData) => void;
    inputRequests: InputRequestData[];
    onUserInput: (
        requestId: string,
        blocksInput: ContentBlocks,
        structuredInput: Record<string, unknown> | null,
    ) => void;
}

const ChatComponent = ({
    messages,
    onMsgBubbleClick,
    inputRequests,
    onUserInput,
}: Props) => {
    const messageContainerRef = useRef<HTMLDivElement>(null);
    const [currentInputRequest, setCurrentInputRequest] =
        useState<InputRequestData | null>(null);
    const [markdown, setMarkdown] = useState<boolean>(true);
    const { t } = useTranslation();

    // tour
    const { registerRunPageTourStep } = useTour();
    const refTextArea = useRef(null);
    const refSendBtn = useRef(null);

    useEffect(() => {
        registerRunPageTourStep({
            title: t('tour.run.textarea-title'),
            description: t('tour.run.textarea-description'),
            target: refTextArea.current,
        });
        registerRunPageTourStep({
            title: t('tour.run.send-title'),
            description: t('tour.run.send-description'),
            target: refSendBtn.current,
        });
    }, []);

    // Scroll to the bottom when new messages are added
    useEffect(() => {
        if (messageContainerRef.current) {
            messageContainerRef.current.scrollTop =
                messageContainerRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (inputRequests.length > 0) {
            setCurrentInputRequest(inputRequests[0]);
        } else {
            setCurrentInputRequest(null);
        }
    }, [inputRequests]);

    const shortcutKeys = isMacOs ? 'COMMAND + ENTER' : 'CTRL + ENTER';

    return (
        <Flex
            style={{
                height: '100%',
                width: '100%',
                maxWidth: 800,
                padding: 16,
                justifyContent:
                    messages.length === 0 ? 'flex-end' : 'space-between',
            }}
            vertical={true}
            align="center"
            justify="space-between"
            gap="small"
        >
            <Flex
                ref={messageContainerRef}
                style={{
                    width: '100%',
                    height: 0,
                    overflow: 'auto',
                    marginBottom: 16,
                    ...RemoveScrollBarStyle,
                }}
                vertical={true}
                flex={1}
                gap="middle"
            >
                {messages.map((msg) => {
                    return (
                        <MessageBubble
                            key={msg.id}
                            msg={msg}
                            markdown={markdown}
                            onClick={() => onMsgBubbleClick(msg)}
                        />
                    );
                })}
            </Flex>

            <Flex vertical={true} style={{ width: '100%' }} gap="small">
                <Flex vertical={false}>
                    <SwitchButton
                        tooltip="Markdown"
                        title="Markdown"
                        activeIcon={<CheckCircleIcon width={18} height={18} />}
                        inactiveIcon={<MarkdownIcon width={18} height={18} />}
                        active={markdown}
                        onClick={() => {
                            setMarkdown((prevState) => !prevState);
                        }}
                    />
                </Flex>

                <UnifiedUserInput
                    isReplying={false}
                    placeholder={
                        currentInputRequest === null
                            ? t('placeholder.input-disable')
                            : t('placeholder.input-as-user', {
                                  name: currentInputRequest.agentName,
                                  shortcutKeys: shortcutKeys,
                              })
                    }
                    sendAllowed={inputRequests.length !== 0}
                    sendTooltip={
                        currentInputRequest === null
                            ? t('tooltip.button.send-message-disable')
                            : t('tooltip.button.send-message', { shortcutKeys })
                    }
                    sendUserInput={(content) => {
                        if (currentInputRequest) {
                            onUserInput(
                                currentInputRequest.requestId,
                                content,
                                null,
                            );
                        }
                    }}
                    actions={
                        <Avatar.Group>
                            {inputRequests.map((request) => (
                                <Tooltip
                                    title={t('tooltip.avatar.request-input', {
                                        name: request.agentName,
                                    })}
                                >
                                    <Avatar size="small">
                                        {request.agentName.slice(0, 2)}
                                    </Avatar>
                                </Tooltip>
                            ))}
                        </Avatar.Group>
                    }
                    textAreaRef={refTextArea}
                />
            </Flex>
        </Flex>
    );
};

export default memo(ChatComponent);
