import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChevronDownIcon, ChevronRightIcon, CopyIcon } from 'lucide-react';

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
import { copyToClipboard } from '@/utils/common';

/** RetrievalDocument schema: id, score (required), content, metadata */
export type RetrievalDocument = {
    id?: string | null;
    score?: number | null;
    content?: string | null;
    metadata?: unknown;
    [key: string]: unknown;
};

function parseRetrievalDocuments(value: unknown): RetrievalDocument[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
        (d): d is RetrievalDocument => d != null && typeof d === 'object',
    );
}

function MetadataDisplay({ value }: { value: unknown }) {
    if (value === undefined || value === null) {
        return (
            <div className="text-sm text-muted-foreground">—</div>
        );
    }
    if (typeof value === 'object') {
        return (
            <div className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                <JsonView
                    value={value as object}
                    displayDataTypes={false}
                    displayObjectSize={false}
                    collapsed={false}
                    shortenTextAfterLength={0}
                />
            </div>
        );
    }
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value) as object;
            return (
                <div className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                    <JsonView
                        value={parsed}
                        displayDataTypes={false}
                        displayObjectSize={false}
                        collapsed={false}
                        shortenTextAfterLength={0}
                    />
                </div>
            );
        } catch {
            return (
                <pre className="m-0 text-sm whitespace-pre-wrap break-words font-sans">
                    {value}
                </pre>
            );
        }
    }
    return (
        <pre className="m-0 text-sm font-sans">{String(value)}</pre>
    );
}

function getMetadataCopyText(value: unknown): string {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    return JSON.stringify(value, null, 2);
}

function RetrievalDocumentItem({ doc }: { doc: RetrievalDocument }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(true);
    const id = doc.id ?? '—';
    const score = doc.score != null ? String(doc.score) : '—';
    const content = doc.content ?? '—';
    const metadata = doc.metadata;
    const contentCopyText =
        doc.content != null && doc.content !== ''
            ? String(doc.content)
            : '';
    const metadataCopyText = getMetadataCopyText(metadata);

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
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        id: {id}
                    </span>
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        score: {score}
                    </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="px-3 pb-3 pt-0 pl-8 space-y-3">
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-muted-foreground text-xs">
                                    content:
                                </span>
                                {contentCopyText && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="h-6 w-6 shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    copyToClipboard(
                                                        contentCopyText,
                                                    );
                                                }}
                                            >
                                                <CopyIcon className="size-3" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {t(
                                                'tooltip.button.copy-to-clipboard',
                                            )}
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </div>
                            <pre className="m-0 text-sm whitespace-pre-wrap break-words font-sans bg-muted/30 p-2 rounded">
                                {content}
                            </pre>
                        </div>
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-muted-foreground text-xs">
                                    metadata:
                                </span>
                                {metadataCopyText && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="h-6 w-6 shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    copyToClipboard(
                                                        metadataCopyText,
                                                    );
                                                }}
                                            >
                                                <CopyIcon className="size-3" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {t(
                                                'tooltip.button.copy-to-clipboard',
                                            )}
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </div>
                            <MetadataDisplay value={metadata} />
                        </div>
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}

interface RetrievalDocumentsListProps {
    documents: RetrievalDocument[];
}

const RetrievalDocumentsList = memo(function RetrievalDocumentsList({
    documents,
}: RetrievalDocumentsListProps) {
    if (!documents.length) {
        return (
            <div className="text-sm text-muted-foreground py-4 text-center">
                —
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {documents.map((doc, i) => (
                <RetrievalDocumentItem key={i} doc={doc} />
            ))}
        </div>
    );
});

export { RetrievalDocumentsList, parseRetrievalDocuments };
