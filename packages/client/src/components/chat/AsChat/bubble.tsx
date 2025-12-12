import { memo, ReactNode } from 'react';
import { ContentType, Reply, TextBlock } from '@shared/types';
import BubbleBlock, {
    CollapsibleBlockDiv,
} from '@/components/chat/bubbles/BubbleBlock';
import SpeechBar from '@/components/chat/bubbles/SpeechBar';
import { CircleAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ReplySpeechState } from '@/context/RunRoomContext';

interface Props {
    reply: Reply;
    avatar: ReactNode;
    markdown: boolean;
    onClick: (reply: Reply) => void;
    userAvatarRight: boolean;
    speechState?: ReplySpeechState;
    onPlaySpeech?: () => void;
    onPauseSpeech?: () => void;
    onPlaybackRateChange?: (rate: number) => void;
    onVolumeChange?: (volume: number) => void;
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
    onPlaybackRateChange,
    onVolumeChange,
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

    const hasAudio = (speechState?.fullAudioData?.length || 0) > 0;
    const showSpeechBar = speechState?.isStreaming || hasAudio;

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
                                playbackRate={speechState?.playbackRate ?? 1.0}
                                volume={speechState?.volume ?? 1.0}
                                onPlay={onPlaySpeech || (() => {})}
                                onPause={onPauseSpeech || (() => {})}
                                onPlaybackRateChange={onPlaybackRateChange || (() => {})}
                                onVolumeChange={onVolumeChange || (() => {})}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default memo(AsBubble);
