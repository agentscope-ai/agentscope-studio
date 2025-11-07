import { memo } from 'react';
import { ContentType, Reply, TextBlock } from '@shared/types';
import NiceAvatar, { genConfig } from 'react-nice-avatar';
import BubbleBlock from '@/components/chat/bubbles/BubbleBlock';
import { CircleAlertIcon } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { useTranslation } from 'react-i18next';

interface Props {
    reply: Reply;
    markdown: boolean;
    onClick: (reply: Reply) => void;
}

const AsBubble = ({ reply, markdown, onClick }: Props) => {
    const {t} = useTranslation();

    const renderBlock = (content: ContentType, markdown: boolean ) => {
        if (typeof content === 'string') {
            return <BubbleBlock
                block={
                    {
                        type: 'text',
                        text: content
                    } as TextBlock
                }
                markdown={markdown}
            />
        }
        return content.map(
            block => <BubbleBlock
                block={block}
                markdown={markdown}
            />
        );
    };
    console.log('Reply Messages', reply);

    return (
        <div
            key={reply.replyId}
            className="flex flex-row space-x-2 p-2 rounded-md w-full max-w-full bg-primary-100 hover:bg-primary-200"
            onClick={() => onClick(reply)}
        >
            <NiceAvatar
                className="w-9 h-9 min-h-9 min-w-9 mt-0.5"
                {...genConfig(reply.replyName)}
            />
            <div className="flex flex-col flex-1 w-0 space-y-2">
                <div className="flex font-bold mt-1">{reply.replyName}</div>
                <div className="flex flex-col w-full max-w-full gap-y-2">
                    {
                        reply.messages.map(
                            msg => {
                                if (msg.role.toLowerCase() === 'user' && reply.replyRole.toLowerCase() === 'assistant') {
                                    return <Accordion
                                        className="w-full"
                                        type="single"
                                        collapsible
                                    >
                                        <AccordionItem value="item-1" className="">
                                            <AccordionTrigger
                                                className="flex flex-row justify-between text-muted bg-primary-400 px-4 h-[36px] items-center rounded-[0] border-l-3 border-primary [&>svg]:stroke-muted"
                                            >
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex flex-row items-center gap-x-3 truncate">
                                                            {t('chat.title-hint-message')}
                                                        <CircleAlertIcon size={14}/>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {t('tooltip.header.hint-message')}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </AccordionTrigger>
                                            <AccordionContent
                                                className="flex w-full bg-primary-300 rounded-[0] border-l-3 border-primary"
                                            >
                                                <div className="flex flex-col w-full max-w-full p-2">
                                                    {renderBlock(msg.content, markdown)}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                }
                                return renderBlock(msg.content, markdown)
                            }
                        )
                    }
                </div>
            </div>
        </div>
    );
};

export default memo(AsBubble);
