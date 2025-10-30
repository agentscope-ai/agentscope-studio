import { memo } from 'react';
import { Avatar, Flex } from 'antd';
import { useTranslation } from 'react-i18next';

import BubbleBlock from '@/components/chat/bubbles/BubbleBlock';
import loadingData from '@/assets/lottie/loading.json';
import Lottie from 'lottie-react';
import LogoIcon from '@/assets/svgs/logo-font.svg?react';

import { ContentBlocks } from '@shared/types';

/**
 * Props for a reply bubble representing a single assistant/user message.
 */
interface Props {
    name: string;
    role: string;
    content: ContentBlocks;
    startTimeStamp: string;
    endTimeStamp?: string;
    finished: boolean;
}

/**
 * Render a single reply bubble with author, content blocks and metadata.
 * Shows a loader when the reply is still streaming; displays total time when available.
 */
const ReplyBubble = ({
    name,
    role,
    content,
    startTimeStamp,
    endTimeStamp,
    finished,
}: Props) => {
    const { t } = useTranslation();

    const totalTime = endTimeStamp
        ? (
              (new Date(endTimeStamp).getTime() -
                  new Date(startTimeStamp).getTime()) /
              1000
          ).toFixed(1)
        : null;

    return (
        <Flex
            style={{
                width: '100%',
                maxWidth: 'var(--chat-max-width)',
            }}
            vertical={true}
            gap={3}
        >
            <Flex
                className="as-reply-bubble"
                style={{
                    width: '100%',
                    padding: 8,
                    borderRadius: 8,
                }}
                vertical={false}
                gap="small"
            >
                {role === 'user' ? null : (
                    <Avatar
                        icon={<LogoIcon width={25} height={25} />}
                        style={{ background: 'white' }}
                    />
                )}
                <Flex
                    style={{ width: 0 }}
                    vertical={true}
                    flex={1}
                    align={role === 'user' ? 'end' : undefined}
                >
                    <Flex
                        style={{
                            height: 32,
                            width: 'fit-content',
                            fontWeight: 500,
                        }}
                        align="center"
                    >
                        {name}
                    </Flex>
                    <Flex
                        vertical={true}
                        style={{
                            width: role === 'user' ? 'fit-content' : '100%',
                            maxWidth: '100%',
                            height: 'fit-content',
                            wordWrap: 'break-word',
                            wordBreak: 'break-word',
                        }}
                        gap={2}
                    >
                        {content.map((block) => (
                            <BubbleBlock block={block} markdown={true} />
                        ))}
                    </Flex>
                </Flex>
                {role === 'user' ? <Avatar /> : null}
            </Flex>
            <Flex
                style={{
                    color: 'var(--muted-foreground)',
                    fontSize: 12,
                    padding: '0 8px',
                    height: 16,
                }}
                vertical={false}
                align="center"
                gap="small"
            >
                <div>{startTimeStamp.split('.')[0]}</div>

                {finished ? null : (
                    <Lottie
                        animationData={loadingData}
                        loop={true}
                        autoplay={true}
                        style={{ width: 40 }}
                    />
                )}

                {totalTime ? (
                    <div>{t('chat.title-time-total', { totalTime })}</div>
                ) : null}
            </Flex>
        </Flex>
    );
};

export default memo(ReplyBubble);
