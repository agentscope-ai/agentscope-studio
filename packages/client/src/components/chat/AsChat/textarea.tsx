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
import { ExpandIcon, PaperclipIcon, PlayIcon, SquareIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AsTextareaDialog from '@/components/chat/AsChat/textarea_dialog.tsx';
import { BlockType, ContentBlocks, TextBlock } from '@shared/types';
import {
    AttachData,
    AttachInput,
    AttachItem,
} from '@/components/chat/AsChat/attach.tsx';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area.tsx';

export interface AsTextareaProps {
    inputText?: string;
    onChange?: (text: string) => void;
    attachment?: AttachData[];
    onAttachChange?: (
        updateFn: (prevAttachData: AttachData[]) => AttachData[],
    ) => void;
    placeholder: string;
    actionType: 'send' | 'interrupt';
    onActionClick: (
        blocksInput: ContentBlocks,
        structuredInput: Record<string, unknown> | null,
    ) => void;
    disableSendBtn: boolean;
    tooltips: {
        expandTextarea?: string;
        attachButton: string;
        sendButton: string;
    };
    expandable?: boolean;
    attachAccept: string[];
    attachMaxFileSize: number;
    onError: (error: string) => void;
    [key: string]: unknown;
}

const AsTextarea = ({
    inputText: externalInputText,
    onChange,
    attachment: externalAttachment,
    onAttachChange,
    placeholder,
    actionType,
    onActionClick,
    disableSendBtn,
    tooltips,
    expandable,
    attachAccept,
    attachMaxFileSize,
    onError,
    ...props
}: AsTextareaProps) => {
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
    const handleAttachChange = (
        updateFn: (prevAttachData: AttachData[]) => AttachData[],
    ) => {
        // If external attachment is not provided, update internal state
        if (externalAttachment === undefined) {
            setInternalAttachment(updateFn);
        }
        // Call the external handler
        onAttachChange?.(updateFn);
    };

    const handleActionClick = () => {
        if (disableSendBtn) {
            onError('No input is required');
            return;
        }

        if (actionType === 'send') {
            if (inputText.length === 0) {
                onError('No input to send');
                return;
            }
            // Prepare the input blocks
            const blocksInput: ContentBlocks = [];
            blocksInput.push({
                type: BlockType.TEXT,
                text: inputText,
            } as TextBlock);
            blocksInput.push(...attachment.map((data) => data.block));

            // TODO: Trigger the structured input generation here

            // send the input
            onActionClick(blocksInput, null);

            // Clear the input
            handleChange('');

            // Clear the attachment
            handleAttachChange(() => []);
        } else {
            onActionClick([], null);
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
                                    handleAttachChange(
                                        (prevAttachData: AttachData[]) =>
                                            prevAttachData.filter(
                                                (_, i) => i !== index,
                                            ),
                                    );
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
                    // When typing Chinese using IME, do not trigger enter key actions
                    if (e.nativeEvent.isComposing) {
                        return;
                    }

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
                        if (actionType === 'send') {
                            handleActionClick();
                        }
                        e.preventDefault();
                        return;
                    }
                }}
            />
            <InputGroupAddon align="block-end">
                <InputGroupText className="text-muted-foreground hidden group-focus-within:inline-flex truncate">
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
                                actionType={actionType}
                                onActionClick={onActionClick}
                                onAttachChange={handleAttachChange}
                                onChange={handleChange}
                                disableSendBtn={disableSendBtn}
                                tooltips={tooltips}
                                attachAccept={attachAccept}
                                attachMaxFileSize={attachMaxFileSize}
                                onError={onError}
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
                                onAttach={(newAttachData) => {
                                    handleAttachChange((prevAttachData) => [
                                        ...prevAttachData,
                                        ...newAttachData,
                                    ]);
                                }}
                                accept={attachAccept}
                                maxFileSize={attachMaxFileSize}
                                onError={onError}
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
                            disabled={disableSendBtn}
                            onClick={() => {
                                handleActionClick();
                            }}
                        >
                            {actionType === 'send' ? (
                                <PlayIcon />
                            ) : (
                                <SquareIcon />
                            )}

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
