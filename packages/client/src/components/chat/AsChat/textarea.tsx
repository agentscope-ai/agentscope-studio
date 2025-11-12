import { memo, useRef, useState } from 'react';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupText,
    InputGroupTextarea,
} from '@/components/ui/input-group.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import { ExpandIcon, PaperclipIcon, PlayIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AsTextareaDialog from '@/components/chat/AsChat/textarea_dialog.tsx';
import { BlockType, ContentBlocks, TextBlock } from '@shared/types';
import {
    AttachData,
    AttachInput,
    AttachItem,
} from '@/components/chat/AsChat/attach.tsx';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area.tsx';

interface Props {
    inputText?: string;
    onChange?: (text: string) => void;
    attachment?: AttachData[];
    onAttach?: (newAttachData: AttachData[]) => void;
    onDeleteAttach?: (index: number) => void;
    placeholder: string;
    onSendClick: (
        blocksInput: ContentBlocks,
        structuredInput: Record<string, unknown> | null,
    ) => void;
    interruptable?: boolean;
    onInterruptClick?: () => void;
    disableSendBtn: boolean;
    tooltips: {
        expandTextarea?: string;
        attachButton: string;
        sendButton: string;
    };
    expandable?: boolean;
    attachAccept: string[];
    attachMaxFileSize: number;
    onAttachError: (error: string) => void;
    [key: string]: unknown;
}

const AsTextarea = ({
    inputText: externalInputText,
    onChange,
    attachment: externalAttachment,
    onAttach,
    onDeleteAttach,
    placeholder,
    onSendClick,
    interruptable,
    onInterruptClick,
    disableSendBtn,
    tooltips,
    expandable,
    attachAccept,
    attachMaxFileSize,
    onAttachError,
    ...props
}: Props) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [internalInputText, setInternalInputText] = useState<string>('');
    const [internalAttachment, setInternalAttachment] = useState<AttachData[]>(
        [],
    );

    const inputText = externalInputText ?? internalInputText;
    const handleChange = (text: string) => {
        if (externalInputText === undefined) {
            setInternalInputText(text);
        }
        onChange?.(text);
    };

    const attachment = externalAttachment ?? internalAttachment;
    const handleAttach = (newAttachData: AttachData[]) => {
        if (externalAttachment === undefined) {
            setInternalAttachment((prev) => [...prev, ...newAttachData]);
        }
        onAttach?.(newAttachData);
    };
    const handleDeleteAttach = (index: number) => {
        if (externalAttachment === undefined) {
            setInternalAttachment((prev) => {
                const newAttach = [...prev];
                newAttach.splice(index, 1);
                return newAttach;
            });
        }
        onDeleteAttach?.(index);
    };

    const handleSendClick = (inputText: string, attachment: AttachData[]) => {
        if (disableSendBtn) {
            onAttachError('No input is required');
            return;
        }

        if (inputText.length === 0) {
            onAttachError('No input to send');
            return;
        }

        // If interruptable, trigger interrupt instead of send
        if (interruptable && onInterruptClick) {
            onInterruptClick();
        } else {
            // Prepare the input blocks
            const blocksInput: ContentBlocks = [];
            if (inputText.length > 0) {
                blocksInput.push({
                    type: BlockType.TEXT,
                    text: inputText,
                } as TextBlock);
            }
            blocksInput.push(...attachment.map((data) => data.block));

            // Send the input
            onSendClick(blocksInput, null);
        }
    };

    return (
        <InputGroup
            className="group h-fit bg-white min-w-fit has-[[data-slot=input-group-control]:focus-visible]:border-primary has-[[data-slot=input-group-control]:focus-visible]:ring-0"
            {...props}
        >
            <InputGroupAddon
                className={`flex flex-row h-fit w-full ${attachment.length <= 0 ? 'hidden' : ''}`}
            >
                <ScrollArea className="w-full h-fit overflow-y-hidden">
                    <ScrollBar className="hidden" orientation="horizontal" />
                    <div className="flex items-center gap-x-2 h-18">
                        {attachment.map((data, index) => (
                            <AttachItem
                                {...data}
                                onDelete={() => {
                                    handleDeleteAttach(index);
                                }}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </InputGroupAddon>
            <InputGroupTextarea
                value={inputText}
                placeholder={placeholder}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={(e) => {
                    // shift + enter for newline
                    if (e.key === 'Enter' && e.shiftKey) {
                        // Add a newline to the current cursor position
                        handleChange(inputText + '\n');
                        e.preventDefault();
                        return;
                    }
                    // When enter is pressed without shift, ctrl, alt, or meta, send the message
                    if (
                        e.key === 'Enter' &&
                        !e.shiftKey &&
                        !e.ctrlKey &&
                        !e.altKey &&
                        !e.metaKey
                    ) {
                        handleSendClick(inputText, attachment);
                        e.preventDefault();
                        return;
                    }
                }}
            />
            <InputGroupAddon align="block-end">
                <InputGroupText className="text-muted-foreground hidden group-focus-within:inline-flex">
                    <Kbd>⏎</Kbd> to send,{' '}
                    <KbdGroup>
                        <Kbd>Shift + ⏎</Kbd>
                    </KbdGroup>{' '}
                    for newline
                </InputGroupText>
                <InputGroupText className="ml-auto truncate">
                    {inputText.length}{' '}
                    {inputText.length > 1
                        ? t('unit.characters')
                        : t('unit.character')}
                </InputGroupText>
                <Separator orientation="vertical" className="!h-4" />
                {expandable ? (
                    <Tooltip>
                        <TooltipTrigger>
                            <AsTextareaDialog
                                inputText={inputText}
                                placeholder={placeholder}
                                attachment={attachment}
                                onAttach={handleAttach}
                                onDeleteAttach={handleDeleteAttach}
                                onSendClick={onSendClick}
                                onChange={handleChange}
                                disableSendBtn={disableSendBtn}
                                tooltips={tooltips}
                                attachAccept={attachAccept}
                                attachMaxFileSize={attachMaxFileSize}
                                onAttachError={onAttachError}
                            >
                                <InputGroupButton
                                    variant="ghost"
                                    className="rounded-full"
                                    size="icon-sm"
                                    onClick={() => {}}
                                >
                                    <ExpandIcon />
                                </InputGroupButton>
                            </AsTextareaDialog>
                        </TooltipTrigger>
                        <TooltipContent>
                            {tooltips.expandTextarea}
                        </TooltipContent>
                    </Tooltip>
                ) : null}
                <Tooltip>
                    <TooltipTrigger>
                        <InputGroupButton
                            variant="ghost"
                            className="rounded-full"
                            size="icon-sm"
                            onClick={() => {
                                fileInputRef.current?.click();
                            }}
                        >
                            <AttachInput
                                fileInputRef={fileInputRef}
                                onAttach={handleAttach}
                                accept={attachAccept}
                                maxFileSize={attachMaxFileSize}
                                onError={onAttachError}
                            />
                            <PaperclipIcon />
                        </InputGroupButton>
                    </TooltipTrigger>
                    <TooltipContent>{tooltips.attachButton}</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger>
                        <InputGroupButton
                            variant="default"
                            className="rounded-full"
                            size="icon-sm"
                            disabled={disableSendBtn || inputText.length === 0}
                            onClick={() =>
                                handleSendClick(inputText, attachment)
                            }
                        >
                            <PlayIcon />
                            <span className="sr-only">Send</span>
                        </InputGroupButton>
                    </TooltipTrigger>
                    <TooltipContent>{tooltips.sendButton}</TooltipContent>
                </Tooltip>
            </InputGroupAddon>
        </InputGroup>
    );
};

export default memo(AsTextarea);
