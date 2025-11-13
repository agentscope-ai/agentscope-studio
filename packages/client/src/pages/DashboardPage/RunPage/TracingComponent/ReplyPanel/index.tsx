import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

import { Reply } from '@shared/types/trpc';
import { ContentType } from '@shared/types/messageForm';
import { MetaDataSection, PanelTitle } from '../ShareComponents.tsx';
import { EmptyMessagePage } from '@/pages/DefaultPage';
import { AlertCircleIcon } from 'lucide-react';

import {
    AccordionContent,
    AccordionTrigger,
    Accordion,
    AccordionItem,
} from '@/components/ui/accordion.tsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';

interface Props {
    reply: Reply | null;
}

const ReplyPanel = ({ reply }: Props) => {
    const { t } = useTranslation();
    if (!reply) {
        return <EmptyMessagePage />;
    }

    const renderCodeBlock = (code: ContentType | object, title: string) => {
        let codeString;
        if (typeof code === 'string') {
            codeString = code;
        } else {
            codeString = JSON.stringify(code, null, 2);
        }

        return (
            <div className="flex flex-col w-full">
                <Accordion className="w-full" type="single" collapsible>
                    <AccordionItem value={title}>
                        <AccordionTrigger className="px-2 h-[36px] items-center">
                            {title}
                        </AccordionTrigger>
                        <AccordionContent>
                            <SyntaxHighlighter
                                language="JSON"
                                showLineNumbers={true}
                                wrapLines={true}
                                customStyle={{
                                    background: 'var(--white)',
                                    borderRadius: '0 0 0.5rem 0.5rem',
                                    fontSize: 12,
                                    minHeight: 200,
                                }}
                            >
                                {codeString}
                            </SyntaxHighlighter>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        );
    };

    return (
        <div className="flex flex-col w-full h-full p-4 overflow-auto gap-y-8">
            <MetaDataSection
                title={t('common.metadata')}
                data={{
                    ReplyId: reply.replyId,
                    Name: reply.replyName,
                    Role: reply.replyRole,
                    CreatedAt: reply.createdAt,
                    '% Messages': reply.messages.length,
                }}
            />

            <div className="flex flex-col w-full gap-y-2">
                <PanelTitle title={t('common.messages')} />
                <Alert>
                    <AlertCircleIcon />
                    <AlertTitle>Hint</AlertTitle>
                    <AlertDescription>{t('hint.messages')}</AlertDescription>
                </Alert>

                <Accordion type="multiple" className="w-full">
                    {reply.messages.map((msg) => (
                        <AccordionItem value={msg.id}>
                            <AccordionTrigger>
                                {msg.name} (role: {msg.role})
                            </AccordionTrigger>
                            <AccordionContent>
                                {renderCodeBlock(msg.content, 'Content')}
                                {renderCodeBlock(msg.metadata, 'Metadata')}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </div>
    );
};

export default memo(ReplyPanel);
