import { memo, ReactNode } from 'react';
import { ContentType, Reply, TextBlock } from '@shared/types';
import BubbleBlock, {
    CollapsibleBlockDiv,
} from '@/components/chat/bubbles/BubbleBlock';
import { CircleAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
    reply: Reply;
    avatar: ReactNode;
    markdown: boolean;
    onClick: (reply: Reply) => void;
    userAvatarRight: boolean;
}

const AsBubble = ({
    reply,
    avatar,
    markdown,
    onClick,
    userAvatarRight = false,
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
                </div>
            </div>
        </div>
    );
};

export default memo(AsBubble);
