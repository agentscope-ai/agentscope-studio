import { memo, ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image } from 'antd';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { SparklesIcon } from 'lucide-react';
import MarkdownRender from '@/components/chat/bubbles/MarkdownRender';

import {
    Base64Source,
    BlockType,
    ContentBlock,
    SourceType,
    ToolResultBlock,
    ToolUseBlock,
    URLSource,
} from '@shared/types';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { Label } from '@/components/ui/label';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip.tsx';

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
        <div className="flex max-w-full break-words whitespace-pre-wrap break-all m-0 w-fit">
            {text}
        </div>
    );
};

/**
 * Render thinking content with special styling and optional markdown support.
 * Displays with a left border and muted colors to distinguish from regular text.
 */
const ThinkingBlockDiv = ({ thinking }: { thinking: string }) => {
    const { t } = useTranslation();
    return (
        <CollapsibleBlockDiv
            title={t('common.thinking')}
            icon={<SparklesIcon size={13} stroke="var(--primary-500)" />}
            content={thinking}
        />
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
    return <video key={url} controls src={url} />;
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
    return <audio key={url} controls src={url} />;
};

/**
 * Render tool usage information in a collapsible panel.
 * Shows tool name and full JSON details with syntax highlighting.
 */
const ToolUseBlockDiv = ({ block }: { block: ToolUseBlock }) => {
    const { t } = useTranslation();
    return (
        <Accordion className="w-full" type="single" collapsible>
            <AccordionItem value="header">
                <AccordionTrigger className="flex flex-row text-sm px-4 py-1.5 w-full rounded-t-[8px] rounded-b-[0px] bg-[#343541] text-white [&>svg]:stroke-white hover:no-underline cursor-pointer data-[state=closed]:rounded-b-[8px]">
                    {t('chat.title-using-tool')}
                    {block.name + ' ...'}
                </AccordionTrigger>
                <AccordionContent className="w-full">
                    <SyntaxHighlighter
                        language="js"
                        customStyle={{
                            cursor: 'default',
                            padding: '16px',
                            margin: 0,
                            background: 'var(--color-code-bg)',
                            borderRadius: '0 0 8px 8px',
                        }}
                    >
                        {JSON.stringify(block, null, 2)}
                    </SyntaxHighlighter>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
};

/**
 * Render tool execution results in a collapsible panel.
 * Supports switching between formatted content and raw JSON output.
 */
const ToolResultBlockDiv = ({ block }: { block: ToolResultBlock }) => {
    const { t } = useTranslation();
    const [displayRaw, setDisplayRaw] = useState<boolean>(false);

    return (
        <Accordion className="w-full max-w-full" type="single" collapsible>
            <AccordionItem value="header">
                <AccordionTrigger className="flex flex-row text-sm px-4 py-1.5 w-full rounded-t-[8px] rounded-b-[0px] bg-[#343541] text-white [&>svg]:stroke-white hover:no-underline cursor-pointer data-[state=closed]:rounded-b-[8px]">
                    <div className="flex flex-row justify-between w-full">
                        <div className="truncate">
                            {t('chat.title-tool-result')}&nbsp;
                            {block.name}
                        </div>
                        <div className="flex items-center space-x-2">
                            <Label className="truncate" htmlFor="display-mode">
                                Display Raw
                            </Label>
                            <Switch
                                id="display-mode"
                                checked={displayRaw}
                                onCheckedChange={(checked) => {
                                    setDisplayRaw(checked);
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                            />
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="w-full">
                    {displayRaw ? (
                        <SyntaxHighlighter
                            language="js"
                            customStyle={{
                                cursor: 'default',
                                padding: '16px',
                                margin: 0,
                                background: 'var(--color-code-bg)',
                                borderRadius: '0 0 8px 8px',
                            }}
                        >
                            {JSON.stringify(block, null, 2)}
                        </SyntaxHighlighter>
                    ) : (
                        <ToolResultRender output={block.output} />
                    )}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
};

/*
 * Render the output of a tool result block.
 *
 * @param output - The output content of the tool result block.
 *
 * @return JSX.Element representing the rendered output.
 */
const ToolResultRender = ({
    output,
}: {
    output: ToolResultBlock['output'];
}) => {
    if (typeof output === 'string') {
        return (
            <div className="w-full bg-[var(--color-code-bg)] p-4 rounded-b-[8px] [&>p]:mt-0!">
                <MarkdownRender text={'- ' + output} />
            </div>
        );
    }

    return (
        <div className="w-full bg-[var(--color-code-bg)] p-4 rounded-b-[8px] [&>p]:mt-0!">
            {output.map((block) => {
                switch (block.type) {
                    case BlockType.TEXT:
                        return <MarkdownRender text={'- ' + block.text} />;
                    case BlockType.IMAGE:
                        if (block.source.type === SourceType.BASE64) {
                            return (
                                <Image
                                    src={block.source.data}
                                    className="max-w-full max-h-[200px]"
                                />
                            );
                        } else if (block.source.type === SourceType.URL) {
                            return (
                                <Image
                                    src={block.source.url}
                                    className="max-w-full max-h-[200px]"
                                />
                            );
                        }
                        return null;
                    case BlockType.AUDIO:
                        if (block.source.type === SourceType.BASE64) {
                            return <audio src={block.source.data} controls />;
                        } else if (block.source.type === SourceType.URL) {
                            return <audio src={block.source.url} controls />;
                        }
                }
            })}
        </div>
    );
};

interface CollapsibleBlockDivProps {
    title: string;
    icon: ReactNode;
    tooltip?: string;
    content: ReactNode;
}

export const CollapsibleBlockDiv = ({
    title,
    content,
    icon,
    tooltip,
}: CollapsibleBlockDivProps) => {
    return (
        <Accordion
            className="w-full"
            type="single"
            collapsible
            defaultValue="thinking"
        >
            <AccordionItem value="thinking">
                <AccordionTrigger className="flex items-center [&>svg]:mb-1 border border-border h-8 max-w-fit px-3 py-1.5 text-muted-foreground text-[12px] hover:no-underline cursor-pointer">
                    {tooltip ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex flex-row items-center gap-x-1 truncate text-[12px]">
                                    {icon}
                                    {title}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>{tooltip}</TooltipContent>
                        </Tooltip>
                    ) : (
                        <div className="flex h-full gap-x-1 items-center">
                            {icon}
                            {title}
                        </div>
                    )}
                </AccordionTrigger>
                <AccordionContent className="border-l border-border p-3 mt-2">
                    {content}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
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
            return <ThinkingBlockDiv thinking={block.thinking} />;
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
