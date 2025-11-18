import { Button } from '@/components/ui/button.tsx';
import { memo, ReactNode } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip.tsx';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    tooltip: string;
    children: ReactNode;
}

const AsTooltipButton = ({ tooltip, children, ...rest }: Props) => {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button {...rest}>{children}</Button>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
    );
};

export default memo(AsTooltipButton);
