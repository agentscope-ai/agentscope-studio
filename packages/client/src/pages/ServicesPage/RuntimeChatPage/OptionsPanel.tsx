import { SettingsIcon } from 'lucide-react';
import { useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import OptionsEditor from './OptionsEditor';

interface OptionsPanelProps {
    value?: Record<string, unknown>;
    onChange?: (values: Record<string, unknown>) => void;
}

export default function OptionsPanel(props: OptionsPanelProps) {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                    <SettingsIcon width={16} height={16} />
                </Button>
            </SheetTrigger>
            <SheetContent className="p-0 flex flex-col gap-0 sm:max-w-md overflow-hidden">
                <SheetHeader className="px-4 py-3 border-b">
                    <SheetTitle className="text-base">Settings</SheetTitle>
                </SheetHeader>
                <OptionsEditor
                    value={props.value}
                    onChange={(v: Record<string, unknown>) => {
                        setOpen(false);
                        props.onChange?.(v);
                    }}
                    onClose={() => setOpen(false)}
                />
            </SheetContent>
        </Sheet>
    );
}
