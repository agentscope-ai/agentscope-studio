import { memo, useState } from 'react';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupText,
    InputGroupTextarea
} from '@/components/ui/input-group.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { ExpandIcon, PaperclipIcon, PlayIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AsTextareaDialog from '@/components/chat/AsChat/textarea_dialog.tsx';
import { ContentBlocks } from '@shared/types';


interface Props {
    inputText?: string;
    onChange?: (text: string) => void;
    attachment?: ContentBlocks;
    onAttach?: (blocksInput: ContentBlocks) => void;
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
    }
    expandable?: boolean;
    [key: string]: unknown;
}


const AsTextarea = (
    {
        inputText: externalInputText,
        onChange,
        attachment: externalAttachment,
        onAttach,
        placeholder,
        onSendClick,
        interruptable,
        onInterruptClick,
        disableSendBtn,
        tooltips,
        expandable,
        ...props
    }: Props
) => {
    const {t} = useTranslation();
    const [internalInputText, setInternalInputText] = useState<string>('');
    const [internalAttachment, setInternalAttachment] = useState<ContentBlocks>([]);

    const inputText = externalInputText ?? internalInputText;
    const handleChange = (text: string) => {
        if (externalInputText === undefined) {
            setInternalInputText(text);
        }
        onChange?.(text);
    };

    const attachment = externalAttachment ?? internalAttachment;
    const handleAttach = (blocksInput: ContentBlocks) => {
        if (externalAttachment === undefined) {
            setInternalAttachment(blocksInput);
        }
        onAttach?.(blocksInput);
    }

    const handleSendClick = () => {
        // If interruptable, trigger interrupt instead of send
        if (interruptable && onInterruptClick) {
            onInterruptClick();
        } else {
            onSendClick(inputText, null);
        }
    }

    return (
        <InputGroup className="max-h-[150px]" {...props}>
            <InputGroupTextarea
                value={inputText}
                placeholder={placeholder}
                onChange={(e) => handleChange(e.target.value)}
            />
            <InputGroupAddon align="block-end">
                <InputGroupText className="ml-auto">
                    {inputText.length} {inputText.length > 1 ? t('unit.characters'): t('unit.character')}
                </InputGroupText>
                <Separator orientation="vertical" className="!h-4" />
                {
                    expandable ? <Tooltip>
                        <TooltipTrigger>
                            <AsTextareaDialog
                                inputText={inputText}
                                placeholder={placeholder}
                                onSendClick={onSendClick}
                                onChange={handleChange}
                                disableSendBtn={disableSendBtn}
                                tooltips={tooltips}
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
                    </Tooltip> : null
                }
                <Tooltip>
                    <TooltipTrigger>
                        <InputGroupButton
                            variant="ghost"
                            className="rounded-full"
                            size="icon-sm"
                        >
                            <PaperclipIcon />
                        </InputGroupButton>
                    </TooltipTrigger>
                    <TooltipContent>
                        {tooltips.attachButton}
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger>
                        <InputGroupButton
                            variant="default"
                            className="rounded-full"
                            size="icon-sm"
                            disabled={disableSendBtn}
                            onClick={handleSendClick}
                        >
                            <PlayIcon />
                            <span className="sr-only">Send</span>
                        </InputGroupButton>
                    </TooltipTrigger>
                    <TooltipContent>
                        {tooltips.sendButton}
                    </TooltipContent>
                </Tooltip>
            </InputGroupAddon>
        </InputGroup>
    );
}

export default memo(AsTextarea);