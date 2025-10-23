import { memo } from 'react';
import { Avatar, Flex, Tooltip } from 'antd';

import { MessageData } from '@shared/types/trpc.ts';
import BubbleBlock from '@/components/chat/bubbles/BubbleBlock';

import '../index.css';

/**
 * Props for a single message bubble in the chat history.
 */
interface Props {
    msg: MessageData;
    markdown: boolean;
    onClick?: () => void;
}

/**
 * Render a message bubble with avatar, author name and content blocks.
 * Supports rendering string or structured ContentBlocks via BubbleBlock.
 */
const MessageBubble = ({ msg, markdown, onClick }: Props) => {
    const renderAvatar = () => {
        return (
            <Tooltip title={msg.name}>
                <Avatar style={{ flexShrink: 0 }}>
                    {msg.name.slice(0, 2)}
                </Avatar>
            </Tooltip>
        );
    };

    return (
        <Flex
            className={'as-message-bubble'}
            style={{
                width: '100%',
                padding: 8,
                borderRadius: 8,
            }}
            vertical={false}
            gap={'small'}
            onClick={onClick}
        >
            {renderAvatar()}
            <Flex style={{ width: 0 }} vertical={true} flex={1}>
                <Flex
                    style={{
                        height: 22,
                        width: 'fit-content',
                        fontWeight: 500,
                    }}
                >
                    {msg.name}
                </Flex>
                <Flex
                    vertical={true}
                    style={{
                        width: '100%',
                        height: 'fit-content',
                        wordWrap: 'break-word',
                        wordBreak: 'break-word',
                    }}
                    gap={2}
                >
                    {typeof msg.content === 'string' ? (
                        <BubbleBlock block={msg.content} markdown={markdown} />
                    ) : (
                        msg.content.map((block) => (
                            <BubbleBlock block={block} markdown={markdown} />
                        ))
                    )}
                </Flex>
            </Flex>
        </Flex>
    );
};

export default memo(MessageBubble);
