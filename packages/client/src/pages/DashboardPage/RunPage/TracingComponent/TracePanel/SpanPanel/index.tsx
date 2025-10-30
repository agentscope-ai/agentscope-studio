import { SpanData } from '@shared/types/trace.ts';
import moment from 'moment';
import { memo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SpanSectionProps {
    title: string;
    description: string;
    content: Record<string, unknown> | string;
}

const SpanSection = memo((props: SpanSectionProps) => {
    return (
        <div>
            <div className="font-bold text-sm">{props.title}</div>
            <div className="text-muted-foreground mb-2">
                {props.description}
            </div>
            <SyntaxHighlighter
                language={'JSON'}
                style={materialDark}
                showLineNumbers={true}
                customStyle={{
                    minHeight: 100,
                    maxHeight: 500,
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    maxWidth: '100%',
                    borderRadius: 6,
                }}
            >
                {typeof props.content === 'string'
                    ? props.content
                    : JSON.stringify(props.content, null, 2)}
            </SyntaxHighlighter>
        </div>
    );
});

interface Props {
    span: SpanData | null;
}

const SpanPanel = ({ span }: Props) => {
    const { t } = useTranslation();
    if (!span) {
        return null;
    }

    const gen_ai_attributes = span.attributes?.gen_ai as Record<string, unknown>;
    const as_attributes = span.attributes?.agentscope?.function || span.attributes as Record<string, unknown>;

    const span_kind = gen_ai_attributes?.operation?.name as string;
    const renderCol = (title: string, value: string | ReactNode) => {
        return (
            <div className="flex col-span-1 pt-4 pb-4 pl-4">
                <div className="flex flex-col gap-y-2">
                    <div className="text-muted-foreground font-bold text-[12px]">
                        {title}
                    </div>
                    <div className="text-primary font-bold text-sm truncate break-all">
                        {value}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-1 flex-col gap-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 border rounded-md">
                {renderCol(t('common.status'), span.status.code === 2 ? 'ERROR' : 'OK')}
                {renderCol(t('common.span-name'), span.name)}
                {renderCol(
                    t('common.start-time'),
                    moment(parseInt(span.startTimeUnixNano) / 1000000).format('YYYY-MM-DD HH:mm:ss'),
                )}
                {renderCol('', '')}
                {renderCol(t('common.span-kind'), span_kind)}
                {renderCol(
                    t('common.end-time'),
                    moment(parseInt(span.endTimeUnixNano) / 1000000).format('YYYY-MM-DD HH:mm:ss'),
                )}
            </div>
            <SpanSection
                title={t('common.metadata')}
                description={t('description.trace.metadata')}
                content={as_attributes?.metadata as unknown as Record<string, unknown>}
            />
            <SpanSection
                title={t('common.input')}
                description={t('description.trace.input')}
                content={as_attributes?.input as unknown as Record<string, unknown>}
            />
            <SpanSection
                title={t('common.output')}
                description={t('description.trace.output')}
                content={as_attributes?.output as unknown as Record<string, unknown>}
            />
        </div>
    );
};

export default memo(SpanPanel);
