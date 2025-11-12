import { memo } from 'react';
import { ContentType, Reply, TextBlock } from '@shared/types';
import BubbleBlock, {
    CollapsibleBlockDiv,
} from '@/components/chat/bubbles/BubbleBlock';
import { CircleAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AsAvatar } from '@/components/chat/AsChat/avatar.tsx';

interface Props {
    reply: Reply;
    markdown: boolean;
    randomAvatar: boolean;
    onClick: (reply: Reply) => void;
}

const AsBubble = ({ reply, markdown, randomAvatar, onClick }: Props) => {
    const { t } = useTranslation();

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
        <div
            key={reply.replyId}
            className="flex flex-row space-x-2 p-2 rounded-md w-full max-w-full border-border bg-white hover:bg-[#FAFAFA] cursor-pointer"
            onClick={() => onClick(reply)}
        >
            <AsAvatar
                name={reply.replyName}
                role={reply.replyRole}
                randomAvatar={randomAvatar}
                seed={14}
            />

            <div className="flex flex-col flex-1 w-0 space-y-2">
                <div className="flex font-bold mt-1">{reply.replyName}</div>
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
                                    content={renderBlock(msg.content, markdown)}
                                    tooltip={t('tooltip.header.hint-message')}
                                />
                            );
                        }
                        return renderBlock(msg.content, markdown);
                    })}
                </div>
            </div>
        </div>
    );
};

export default memo(AsBubble);
