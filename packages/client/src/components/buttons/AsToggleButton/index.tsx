import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import { ComponentProps, memo, ReactNode } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils';

interface Props extends ComponentProps<'button'> {
    tooltip: string;
    children: ReactNode;
    active?: boolean;
    [key: string]: unknown;
}

const AsToggleButton = ({
    tooltip,
    children,
    active,
    className,
    ...rest
}: Props) => {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    className={cn('group', className)}
                    data-active={active}
                    {...rest}
                >
                    {children}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
    );
};

export default memo(AsToggleButton);
