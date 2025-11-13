import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { memo, ReactNode } from 'react';
import AsTextarea, {
    AsTextareaProps,
} from '@/components/chat/AsChat/textarea.tsx';

interface Props extends AsTextareaProps {
    children: ReactNode;
}

const AsTextareaDialog = ({ children, ...props }: Props) => {
    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent
                className="p-0 h-[calc(100vh-100px)]"
                showCloseButton={false}
            >
                <AsTextarea {...props} className="h-full" expandable={false} />
            </DialogContent>
        </Dialog>
    );
};

export default memo(AsTextareaDialog);
