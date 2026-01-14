import { memo, ReactNode, useMemo } from 'react';
import { ContentType, Reply, TextBlock } from '@shared/types';
import BubbleBlock, {
    CollapsibleBlockDiv,
} from '@/components/chat/bubbles/BubbleBlock';
import SpeechBar from '@/components/chat/bubbles/SpeechBar';
import { CircleAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ReplySpeechState } from '@/context/RunRoomContext';

interface Props {
    /** The reply data to display */
    reply: Reply;
    /** Avatar component to display */
    avatar: ReactNode;
    /** Whether to render content as markdown */
    markdown: boolean;
    /** Callback when bubble is clicked */
    onClick: (reply: Reply) => void;
    /** Whether to display user avatar on the right side */
    userAvatarRight: boolean;
    /** Speech state for this reply */
    speechState?: ReplySpeechState;
    /** Callback to play speech audio */
    onPlaySpeech?: () => void;
    /** Callback to pause speech audio */
    onPauseSpeech?: () => void;
    /** Callback to stop other speech audio */
    onStopOtherSpeech?: () => void;
}

const AsBubble = ({
    reply,
    avatar,
    markdown,
    onClick,
    userAvatarRight = false,
    speechState,
    onPlaySpeech,
    onPauseSpeech,
    onStopOtherSpeech,
}: Props) => {
    const { t } = useTranslation();

    const avatarRight =
        userAvatarRight && reply.replyRole.toLowerCase() === 'user';

    const renderBlock = (content: ContentType, markdown: boolean) => {
        if (typeof content === 'string') {
            return (
                <BubbleBlock
                    block={
                        {
                            type: 'text',
                            text: content,
                        } as TextBlock
                    }
                    markdown={markdown}
                />
            );
        }
        return content.map((block) => (
            <BubbleBlock block={block} markdown={markdown} />
        ));
    };
    const onPlay = () => {
        onStopOtherSpeech?.();
        onPlaySpeech?.();
    };

    const hasAudio = useMemo(
        () => (speechState?.fullAudioData?.length || 0) > 0,
        [speechState?.fullAudioData],
    );
    const showSpeechBar = useMemo(
        () => speechState?.isStreaming || hasAudio,
        [speechState?.isStreaming, hasAudio],
    );

    return (
        <div className="flex flex-col w-full max-w-full">
            <div
                key={reply.replyId}
                className={`flex flex-row${avatarRight ? '-reverse space-x-reverse' : ''} space-x-2 p-2 rounded-md w-full max-w-full bg-white active:bg-[#FAFAFA] cursor-pointer`}
                onClick={() => onClick(reply)}
            >
                {avatar}

                <div className="flex flex-col flex-1 w-0 space-y-2">
                    <div
                        className={`flex font-bold mt-1 w-full ${avatarRight ? 'justify-end' : ''}`}
                    >
                        {reply.replyName}
                    </div>
                    {/*Suppose the user input doesn't contain specially input */}
                    <div className="flex flex-col w-full max-w-full gap-y-2">
                        {reply.messages.map((msg) => {
                            if (
                                msg.role.toLowerCase() === 'user' &&
                                reply.replyRole.toLowerCase() === 'assistant'
                            ) {
                                return (
                                    <CollapsibleBlockDiv
                                        title={t('chat.title-hint-message')}
                                        icon={<CircleAlertIcon size={12} />}
                                        content={renderBlock(
                                            msg.content,
                                            markdown,
                                        )}
                                        tooltip={t(
                                            'tooltip.header.hint-message',
                                        )}
                                    />
                                );
                            }
                            return renderBlock(msg.content, markdown);
                        })}
                    </div>

                    {/* Speech bar - shown below the message content */}
                    {showSpeechBar && (
                        <div className="mt-2">
                            <SpeechBar
                                isPlaying={speechState?.isPlaying || false}
                                isStreaming={speechState?.isStreaming || false}
                                hasAudio={hasAudio}
                                onPlay={onPlay}
                                onPause={onPauseSpeech || (() => {})}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default memo(AsBubble);
