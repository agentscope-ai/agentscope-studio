import { Flex } from 'antd';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

import { MessageData } from '@shared/types/trpc';
import { RemoveScrollBarStyle } from '@/styles.ts';
import { ContentType } from '@shared/types/messageForm';
import { MetaDataSection } from '../ShareComponents.tsx';
import { EmptyMessagePage } from '../../../../DefaultPage';

import styles from '@/components/chat/bubbles/MarkdownRender/styles.ts';
interface Props {
    msg: MessageData | null;
}

const MsgPanel = ({ msg }: Props) => {
    const { t } = useTranslation();

    if (!msg) {
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
            <Flex
                vertical={true}
                style={{
                    width: '100%',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                }}
            >
                <Flex
                    style={{
                        background: 'var(--primary-100)',
                        borderRadius: '0.5rem 0.5rem 0 0',
                        padding: '4px 8px',
                        color: 'var(--muted-foreground)',
                        fontSize: 12,
                        fontWeight: 500,
                        boxSizing: 'border-box',
                        borderBottom: '1px solid var(--border)',
                    }}
                    justify="space-between"
                >
                    <span>{title}</span>
                </Flex>
                <SyntaxHighlighter
                    language="JSON"
                    style={styles}
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
            </Flex>
        );
    };

    return (
        <Flex
            vertical={true}
            style={{
                width: '100%',
                overflow: 'auto',
                padding: 16,
                height: '100%',
                ...RemoveScrollBarStyle,
            }}
            gap="large"
        >
            <MetaDataSection
                title={t('common.metadata')}
                data={{
                    Id: msg.id,
                    Name: msg.name,
                    Role: msg.role,
                    Timestamp: msg.timestamp,
                }}
            />

            {renderCodeBlock(msg.content, 'Content')}

            {renderCodeBlock(msg.metadata, 'Metadata')}
        </Flex>
    );
};

export default memo(MsgPanel);
