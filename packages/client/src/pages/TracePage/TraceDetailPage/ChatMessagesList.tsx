import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChevronDownIcon, ChevronRightIcon, Maximize2 } from 'lucide-react';

import { getNestedValue } from '@shared/utils/objectUtils';
import JsonView from '@uiw/react-json-view';

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

/** ChatMessage part 类型 */
type MessagePart = {
    type: string;
    content?: string;
    name?: string;
    id?: string | null;
    arguments?: unknown;
    response?: unknown;
    server_tool_call?: unknown;
    server_tool_call_response?: unknown;
    file_id?: string;
    uri?: string;
    mime_type?: string | null;
    modality?: string;
    [key: string]: unknown;
};

/** ChatMessage 结构 */
type ChatMessage = {
    role: string;
    parts?: MessagePart[];
    name?: string | null;
    finish_reason?: string;
    [key: string]: unknown;
};

const CHAT_OPS = [
    'invoke_agent',
    'chat',
    'generate_content',
    'text_completion',
    'enter',
];

function isChatOp(span: { attributes?: Record<string, unknown> }): boolean {
    const op = getNestedValue(span.attributes ?? {}, 'gen_ai.operation.name') ??
        (span.attributes ?? {})['gen_ai.operation.name'];
    return typeof op === 'string' && CHAT_OPS.includes(op);
}

function parseMessages(value: unknown): ChatMessage[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
        (m): m is ChatMessage =>
            m && typeof m === 'object' && typeof (m as ChatMessage).role === 'string',
    );
}

function formatPartTypeLabel(type: string): string {
    return type
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
        .join(' ');
}

function getPartTypeBadgeClass(type: string): string {
    switch (type) {
        case 'text':
            return 'bg-muted/80 text-muted-foreground';
        case 'reasoning':
            return 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
        case 'tool_call':
            return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
        case 'tool_call_response':
            return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
        case 'server_tool_call':
            return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
        case 'server_tool_call_response':
            return 'bg-teal-500/10 text-teal-600 dark:text-teal-400';
        case 'blob':
        case 'file':
        case 'uri':
            return 'bg-muted/80 text-muted-foreground';
        default:
            return 'bg-muted/80 text-muted-foreground';
    }
}

function PartWithLabel({
    type,
    children,
}: {
    type: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-md border border-border/60 bg-muted/10 overflow-hidden">
            <div className="px-2 py-1 border-b border-border/40">
                <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getPartTypeBadgeClass(
                        type,
                    )}`}
                >
                    {formatPartTypeLabel(type)}
                </span>
            </div>
            <div className="p-2">{children}</div>
        </div>
    );
}

function renderPart(part: MessagePart, index: number): React.ReactNode {
    const type = part.type;
    switch (type) {
        case 'text':
            return (
                <PartWithLabel key={index} type={type}>
                    <div className="text-sm whitespace-pre-wrap break-words">
                        {part.content ?? ''}
                    </div>
                </PartWithLabel>
            );
        case 'reasoning':
            return (
                <PartWithLabel key={index} type={type}>
                    <div className="text-sm text-muted-foreground italic whitespace-pre-wrap break-words">
                        {part.content ?? ''}
                    </div>
                </PartWithLabel>
            );
        case 'tool_call':
            return (
                <PartWithLabel key={index} type={type}>
                    <div className="text-sm space-y-1.5">
                        {part.id != null && (
                            <div>
                                <span className="text-muted-foreground text-xs">
                                    id:
                                </span>{' '}
                                <code className="text-xs bg-muted/50 px-1 rounded">
                                    {String(part.id)}
                                </code>
                            </div>
                        )}
                        <div>
                            <span className="text-muted-foreground text-xs">
                                name:
                            </span>{' '}
                            <span className="font-medium text-primary">
                                {part.name ?? '—'}
                            </span>
                        </div>
                        {part.arguments != null && (
                            <div>
                                <span className="text-muted-foreground text-xs block mb-1">
                                    arguments:
                                </span>
                                <div className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                                    <JsonView
                                        value={
                                            typeof part.arguments === 'string'
                                                ? (() => {
                                                      try {
                                                          return JSON.parse(
                                                              part.arguments!,
                                                          ) as object;
                                                      } catch {
                                                          return {
                                                              raw: part
                                                                  .arguments,
                                                          } as object;
                                                      }
                                                  })()
                                                : (part.arguments ?? {}) as object
                                        }
                                        displayDataTypes={false}
                                        displayObjectSize={false}
                                        collapsed={false}
                                        shortenTextAfterLength={0}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </PartWithLabel>
            );
        case 'tool_call_response':
            return (
                <PartWithLabel key={index} type={type}>
                    <div className="text-sm space-y-1.5">
                        {part.id != null && (
                            <div>
                                <span className="text-muted-foreground text-xs">
                                    id:
                                </span>{' '}
                                <code className="text-xs bg-muted/50 px-1 rounded">
                                    {String(part.id)}
                                </code>
                            </div>
                        )}
                        <div>
                            <span className="text-muted-foreground text-xs block mb-1">
                                response:
                            </span>
                            <div className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                                <JsonView
                                    value={
                                        typeof part.response === 'string'
                                            ? (() => {
                                                  try {
                                                      return JSON.parse(
                                                          part.response!,
                                                      ) as object;
                                                  } catch {
                                                      return {
                                                          raw: part.response,
                                                      } as object;
                                                  }
                                              })()
                                            : (part.response ?? {}) as object
                                    }
                                    displayDataTypes={false}
                                    displayObjectSize={false}
                                    collapsed={false}
                                    shortenTextAfterLength={0}
                                />
                            </div>
                        </div>
                    </div>
                </PartWithLabel>
            );
        case 'server_tool_call':
            return (
                <PartWithLabel key={index} type={type}>
                    <div className="text-sm space-y-1.5">
                        {part.id != null && (
                            <div>
                                <span className="text-muted-foreground text-xs">
                                    id:
                                </span>{' '}
                                <code className="text-xs bg-muted/50 px-1 rounded">
                                    {String(part.id)}
                                </code>
                            </div>
                        )}
                        <div>
                            <span className="text-muted-foreground text-xs">
                                name:
                            </span>{' '}
                            <span className="font-medium">
                                {part.name ?? '—'}
                            </span>
                        </div>
                        {part.server_tool_call != null && (
                            <div>
                                <span className="text-muted-foreground text-xs block mb-1">
                                    server_tool_call:
                                </span>
                                <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                                    {JSON.stringify(
                                        part.server_tool_call,
                                        null,
                                        2,
                                    )}
                                </pre>
                            </div>
                        )}
                    </div>
                </PartWithLabel>
            );
        case 'server_tool_call_response':
            return (
                <PartWithLabel key={index} type={type}>
                    <div className="text-sm">
                        {part.server_tool_call_response != null && (
                            <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                                {JSON.stringify(
                                    part.server_tool_call_response,
                                    null,
                                    2,
                                )}
                            </pre>
                        )}
                    </div>
                </PartWithLabel>
            );
        case 'blob':
            return (
                <PartWithLabel key={index} type={type}>
                    <div className="text-xs text-muted-foreground">
                        {part.mime_type ?? part.modality ?? 'binary'}
                    </div>
                </PartWithLabel>
            );
        case 'file':
            return (
                <PartWithLabel key={index} type={type}>
                    <div className="text-sm">
                        file_id: {part.file_id ?? '—'}
                    </div>
                </PartWithLabel>
            );
        case 'uri':
            return (
                <PartWithLabel key={index} type={type}>
                    <div className="text-sm break-all">
                        <a
                            href={part.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                        >
                            {part.uri}
                        </a>
                    </div>
                </PartWithLabel>
            );
        default:
            return (
                <PartWithLabel key={index} type={type}>
                    <div className="text-xs">
                        <JsonView
                            value={part as object}
                            displayDataTypes={false}
                            displayObjectSize={false}
                            collapsed={false}
                            shortenTextAfterLength={0}
                        />
                    </div>
                </PartWithLabel>
            );
    }
}

function getRoleBadgeClass(role: string): string {
    switch (role?.toLowerCase()) {
        case 'system':
            return 'bg-muted text-muted-foreground';
        case 'user':
            return 'bg-primary/10 text-primary';
        case 'assistant':
            return 'bg-green-500/10 text-green-600 dark:text-green-400';
        case 'tool':
            return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
        default:
            return 'bg-muted/80 text-muted-foreground';
    }
}

interface ChatMessagesListProps {
    messages: ChatMessage[];
    onViewMessageJson?: (msg: ChatMessage) => void;
}

function ChatMessageItem({
    msg,
    onViewMessageJson,
}: {
    msg: ChatMessage;
    onViewMessageJson?: (msg: ChatMessage) => void;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(true);
    const hasContent =
        Array.isArray(msg.parts) && msg.parts.length > 0;
    const hasFinishReason = msg.finish_reason != null;

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
                <CollapsibleTrigger className="w-full flex items-center gap-2 p-3 bg-muted/40 hover:bg-muted/50 transition-colors text-left">
                    <span className="shrink-0">
                        {open ? (
                            <ChevronDownIcon className="size-3.5 text-muted-foreground" />
                        ) : (
                            <ChevronRightIcon className="size-3.5 text-muted-foreground" />
                        )}
                    </span>
                    <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${getRoleBadgeClass(
                            msg.role,
                        )}`}
                    >
                        {msg.role}
                    </span>
                    {msg.name && (
                        <span className="text-xs text-muted-foreground truncate">
                            {msg.name}
                        </span>
                    )}
                    {(hasFinishReason || onViewMessageJson) && (
                        <span className="ml-auto shrink-0 flex items-center gap-1">
                            {hasFinishReason && (
                                <span className="rounded-md border border-primary/40 bg-primary/20 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm">
                                    {msg.finish_reason}
                                </span>
                            )}
                            {onViewMessageJson && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            className="h-6 w-6 shrink-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onViewMessageJson(msg);
                                            }}
                                        >
                                            <Maximize2 className="size-3" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {t('trace.viewInModal')}
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </span>
                    )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="px-3 pb-3 pt-0 pl-8 space-y-2">
                        {hasContent ? (
                            msg.parts!.map((p, j) => renderPart(p, j))
                        ) : (
                            <div className="text-sm text-muted-foreground">—</div>
                        )}
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}

const ChatMessagesList = memo(function ChatMessagesList({
    messages,
    onViewMessageJson,
}: ChatMessagesListProps) {
    if (!messages.length) {
        return (
            <div className="text-sm text-muted-foreground py-4 text-center">
                —
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {messages.map((msg, i) => (
                <ChatMessageItem
                    key={i}
                    msg={msg}
                    onViewMessageJson={onViewMessageJson}
                />
            ))}
        </div>
    );
});

export { ChatMessagesList, isChatOp, parseMessages };
export type { ChatMessage, MessagePart };
