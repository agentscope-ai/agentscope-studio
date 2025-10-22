import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Collapse, Flex, Image, Switch, Tooltip } from 'antd';

import MarkdownRender from '@/components/chat/bubbles/MarkdownRender';
import FoldDownIcon from '@/assets/svgs/fold-down.svg?react';

import { SingleLineEllipsisStyle } from '@/styles.ts';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
    Base64Source,
    BlockType,
    ContentBlock,
    SourceType,
    ToolResultBlock,
    ToolUseBlock,
    URLSource,
} from '@shared/types';

/**
 * Props for the BubbleBlock component that renders different types of content blocks.
 */
interface Props {
    block: ContentBlock | string;
    markdown?: boolean;
}

/**
 * Render text content with optional markdown support.
 * Falls back to plain text with proper word wrapping if markdown is disabled.
 */
const TextBlockDiv = ({
    text,
    markdown,
}: {
    text: string;
    markdown: boolean;
}) => {
    if (markdown) {
        return <MarkdownRender text={text} />;
    }
    return (
        <div
            style={{
                maxWidth: '100%',
                overflowWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                margin: 0,
            }}
        >
            {text}
        </div>
    );
};

/**
 * Render thinking content with special styling and optional markdown support.
 * Displays with a left border and muted colors to distinguish from regular text.
 */
const ThinkingBlockDiv = ({
    thinking,
    markdown,
}: {
    thinking: string;
    markdown: boolean;
}) => {
    const { t } = useTranslation();
    return (
        <div className="pl-3 w-full h-fit border-l-2 border-l-muted-foreground/30 mt-2 mb-2 text-muted-foreground">
            <div className="font-bold">
                {t('common.thinking').toUpperCase()}
            </div>
            {markdown ? (
                <MarkdownRender text={thinking} />
            ) : (
                <div className="w-full whitespace-pre-wrap break-all pre-wrap wrap-break-word">
                    {thinking}
                </div>
            )}
        </div>
    );
};

/**
 * Render image content from base64 or URL sources.
 * Supports both embedded base64 data and external URLs.
 */
const ImageBlockDiv = ({ source }: { source: Base64Source | URLSource }) => {
    let url: string;
    if (source.type === SourceType.BASE64) {
        url = `data:${source.media_type};base64,${source.data}`;
    } else if (source.type === SourceType.URL) {
        url = source.url;
    } else {
        return null;
    }
    return <Image width={150} key={url} src={url} alt={url} />;
};

/**
 * Render video content from base64 or URL sources.
 * Note: Currently renders as audio element - may need correction for actual video.
 */
const VideoBlockDiv = ({ source }: { source: Base64Source | URLSource }) => {
    let url: string;
    if (source.type === 'base64') {
        url = `data:${source.media_type};base64,${source.data}`;
    } else {
        url = source.url;
    }
    return (
        <audio key={url} controls>
            <source src={url} type={'audio/mpeg'} />
        </audio>
    );
};

/**
 * Render audio content from base64 or URL sources.
 * Note: Currently renders as video element - may need correction for actual audio.
 */
const AudioBlockDiv = ({ source }: { source: Base64Source | URLSource }) => {
    let url: string;
    if (source.type === 'base64') {
        url = `data:${source.media_type};base64,${source.data}`;
    } else {
        url = source.url;
    }
    return (
        <video key={url} controls>
            <source src={url} type={'video/mp4'} />
        </video>
    );
};

/**
 * Render tool usage information in a collapsible panel.
 * Shows tool name and full JSON details with syntax highlighting.
 */
const ToolUseBlockDiv = ({ block }: { block: ToolUseBlock }) => {
    const { t } = useTranslation();
    return (
        <Collapse
            style={{ border: 'none', width: '100%' }}
            expandIcon={(panelProps) =>
                panelProps.isActive ? (
                    <FoldDownIcon width={15} height={15} />
                ) : (
                    <FoldDownIcon
                        width={15}
                        height={15}
                        style={{ transform: 'rotate(-90deg)' }}
                    />
                )
            }
            size={'small'}
            items={[
                {
                    key: BlockType.TOOL_USE + block.id,
                    label: (
                        <Flex
                            style={{
                                fontSize: 14,
                                ...SingleLineEllipsisStyle,
                            }}
                        >
                            {t('chat.title-using-tool')}&nbsp;
                            <div style={{ fontWeight: 550 }}>{block.name}</div>
                            &nbsp;{' ...'}
                        </Flex>
                    ),
                    children: (
                        <SyntaxHighlighter
                            language={'json'}
                            style={materialDark}
                            showLineNumbers={true}
                            customStyle={{
                                margin: 0,
                                borderRadius: '0 0 8px 8px',
                                padding: '12px 4px',
                            }}
                        >
                            {JSON.stringify(block, null, 4)}
                        </SyntaxHighlighter>
                    ),
                },
            ]}
        />
    );
};

/**
 * Render tool execution results in a collapsible panel.
 * Supports switching between formatted content and raw JSON output.
 */
const ToolResultBlockDiv = ({ block }: { block: ToolResultBlock }) => {
    const { t } = useTranslation();
    const [displayRaw, setDisplayRaw] = useState<boolean>(false);

    // Extract display content from tool output (string or text blocks)
    let displayContent: string = '';
    if (typeof block.output === 'string') {
        displayContent = block.output;
    } else {
        for (const item of block.output) {
            if (item.type === BlockType.TEXT) {
                displayContent = item.text;
            }
        }
    }

    return (
        <Collapse
            style={{ border: 'none' }}
            expandIcon={(panelProps) =>
                panelProps.isActive ? (
                    <FoldDownIcon width={15} height={15} />
                ) : (
                    <FoldDownIcon
                        width={15}
                        height={15}
                        style={{ transform: 'rotate(-90deg)' }}
                    />
                )
            }
            size={'small'}
            items={[
                {
                    key: BlockType.TOOL_RESULT + block.id,
                    label: (
                        <Flex
                            style={{
                                fontSize: 14,
                                ...SingleLineEllipsisStyle,
                            }}
                        >
                            {t('chat.title-tool-result')}&nbsp;
                            <div style={{ fontWeight: 550 }}>{block.name}</div>
                        </Flex>
                    ),
                    children: (
                        <SyntaxHighlighter
                            language={'json'}
                            style={materialDark}
                            showLineNumbers={true}
                            customStyle={{
                                margin: 0,
                                borderRadius: '0 0 8px 8px',
                                padding: '12px 4px',
                            }}
                        >
                            {displayRaw
                                ? JSON.stringify(block, null, 4)
                                : displayContent}
                        </SyntaxHighlighter>
                    ),
                    extra: (
                        <Tooltip title={t('tooltip.switch.display-raw-data')}>
                            <Flex
                                style={{ height: 22 }}
                                align={'center'}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                            >
                                <Switch
                                    value={displayRaw}
                                    size={'small'}
                                    style={{
                                        background: 'var(--muted-foreground)',
                                    }}
                                    onChange={(checked, e) => {
                                        setDisplayRaw(checked);
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }}
                                    onClick={(_, e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }}
                                />
                            </Flex>
                        </Tooltip>
                    ),
                },
            ]}
        />
    );
};

/**
 * Main component that renders different types of content blocks in chat bubbles.
 * Supports text, thinking, media (image/video/audio), and tool-related content.
 */
const BubbleBlock = ({ block, markdown = true }: Props) => {
    if (typeof block === 'string') {
        return <TextBlockDiv text={block} markdown={markdown} />;
    }

    switch (block.type) {
        case BlockType.TEXT:
            return <TextBlockDiv text={block.text} markdown={markdown} />;
        case BlockType.THINKING:
            return (
                <ThinkingBlockDiv
                    thinking={block.thinking}
                    markdown={markdown}
                />
            );
        case BlockType.IMAGE:
            return <ImageBlockDiv source={block.source} />;
        case BlockType.VIDEO:
            return <VideoBlockDiv source={block.source} />;
        case BlockType.AUDIO:
            return <AudioBlockDiv source={block.source} />;
        case BlockType.TOOL_USE:
            return <ToolUseBlockDiv block={block} />;
        case BlockType.TOOL_RESULT:
            return <ToolResultBlockDiv block={block} />;
    }
};

export default memo(BubbleBlock);
