import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { memo, ReactNode } from 'react';
import AsTextarea from '@/components/chat/AsChat/textarea.tsx';
import { ContentBlocks } from '@shared/types';
import { AttachData } from '@/components/chat/AsChat/attach.tsx';

interface Props {
    inputText: string;
    placeholder: string;
    onChange: (text: string) => void;
    attachment: AttachData[];
    onAttach?: (newAttachData: AttachData[]) => void;
    onDeleteAttach?: (index: number) => void;
    onSendClick: (
        blocksInput: ContentBlocks,
        structuredInput: Record<string, unknown> | null,
    ) => void;
    disableSendBtn: boolean;
    tooltips: {
        attachButton: string;
        sendButton: string;
    };
    attachAccept: string[];
    attachMaxFileSize: number;
    onAttachError: (error: string) => void;
    children: ReactNode;
}

const AsTextareaDialog = ({
    inputText,
    placeholder,
    onChange,
    attachment,
    onAttach,
    onDeleteAttach,
    onSendClick,
    disableSendBtn,
    tooltips,
    attachAccept,
    attachMaxFileSize,
    onAttachError,
    children,
}: Props) => {
    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent
                className="p-0 h-[calc(100vh-100px)]"
                showCloseButton={false}
            >
                <AsTextarea
                    className="h-full"
                    inputText={inputText}
                    attachment={attachment}
                    onAttach={onAttach}
                    onDeleteAttach={onDeleteAttach}
                    placeholder={placeholder}
                    onSendClick={onSendClick}
                    onChange={onChange}
                    disableSendBtn={disableSendBtn}
                    tooltips={tooltips}
                    attachAccept={attachAccept}
                    attachMaxFileSize={attachMaxFileSize}
                    onAttachError={onAttachError}
                />
            </DialogContent>
        </Dialog>
    );
};

export default memo(AsTextareaDialog);
