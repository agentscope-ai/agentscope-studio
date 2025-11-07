import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { memo, ReactNode } from 'react';
import AsTextarea from '@/components/chat/AsChat/textarea.tsx';
import { ContentBlocks } from '@shared/types';

interface Props {
    inputText: string,
    placeholder: string;
    onChange: (text: string) => void;
    onSendClick: (
        blocksInput: ContentBlocks,
        structuredInput: Record<string, unknown> | null,
    ) => void;
    disableSendBtn: boolean;
    tooltips: {
        attachButton: string;
        sendButton: string;
    }
    children: ReactNode
}

const AsTextareaDialog = (
    {
        inputText,
        placeholder,
        onChange,
        onSendClick,
        disableSendBtn,
        tooltips,
        children
    }: Props
) => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="p-0 h-[calc(100vh-100px)]" showCloseButton={false}>
                <AsTextarea
                    className="h-full"
                    inputText={inputText}
                    placeholder={placeholder}
                    onSendClick={onSendClick}
                    onChange={onChange}
                    disableSendBtn={disableSendBtn}
                    tooltips={tooltips}
                />
            </DialogContent>
        </Dialog>
    )
}

export default memo(AsTextareaDialog);