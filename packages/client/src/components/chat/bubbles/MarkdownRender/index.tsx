import { Button, Flex } from 'antd';
import { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import CopyIcon from '@/assets/svgs/copy.svg?react';
import CheckIcon from '@/assets/svgs/check.svg?react';

import { copyToClipboard } from '@/utils/common.ts';

import './index.css';
interface Props {
    text: string;
}

/**
 * Render markdown content with custom styling and code block support.
 * - Links: emphasized with underline and bold style
 * - Inline code: keeps inline flow with wrapping
 * - Code blocks: syntax highlighted with copy-to-clipboard header
 */
const MarkdownRender = ({ text }: Props) => {
    return (
        <ReactMarkdown
            components={{
                a: function ({ ...props }) {
                    return (
                        <a
                            style={{
                                textDecoration: 'underline',
                                fontWeight: 'bold',
                            }}
                            {...props}
                        />
                    );
                },
                code: function ({ className, children, ...props }) {
                    if (className === undefined) {
                        return (
                            <code
                                style={{
                                    display: 'inline',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                }}
                                {...props}
                            >
                                {children}
                            </code>
                        );
                    }

                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : 'text';

                    return (
                        <Flex
                            vertical={true}
                            style={{ margin: '6px 0', width: '100%' }}
                        >
                            <CodeHeader
                                onCopyBtnClick={() =>
                                    copyToClipboard(String(children))
                                }
                                language={language}
                            />

                            <SyntaxHighlighter
                                language={language}
                                style={materialDark}
                                showLineNumbers={true}
                                customStyle={{
                                    margin: 0,
                                    borderRadius: '0 0 8px 8px',
                                }}
                            >
                                {String(children)}
                            </SyntaxHighlighter>
                        </Flex>
                    );
                },
            }}
        >
            {text}
        </ReactMarkdown>
    );
};

export default memo(MarkdownRender);

interface CodeHeaderProps {
    language: string;
    onCopyBtnClick: () => Promise<boolean>;
}

/**
 * Header for code blocks that displays the language and a copy button.
 * Shows success feedback temporarily after copying.
 */
const CodeHeader = ({ language, onCopyBtnClick }: CodeHeaderProps) => {
    const [copyState, setCopyState] = useState<'wait' | 'success' | 'error'>(
        'wait',
    );

    return (
        <Flex
            justify="space-between"
            align="center"
            style={{
                padding: '8px 16px',
                background: 'var(--zinc-400)',
                borderRadius: '8px 8px 0 0',
                height: 30,
                color: 'var(--white)',
            }}
        >
            <span>{language.toUpperCase()}</span>
            <Button
                type="text"
                size={'small'}
                icon={
                    copyState === 'success' ? (
                        <CheckIcon fill={'white'} width={13} height={13} />
                    ) : copyState === 'wait' ? (
                        <CopyIcon
                            width={13}
                            height={13}
                            style={{ color: 'var(--white)' }}
                        />
                    ) : null
                }
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (copyState === 'wait') {
                        onCopyBtnClick()
                            .then((success) => {
                                if (success) {
                                    setCopyState('success');
                                    setTimeout(() => {
                                        setCopyState('wait');
                                    }, 2000);
                                }
                            })
                            .catch(() => {
                                setCopyState('error');
                                setTimeout(() => {
                                    setCopyState('wait');
                                }, 2000);
                            });
                    }
                }}
            />
        </Flex>
    );
};
