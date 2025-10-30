import * as React from 'react';
import { cn } from '@/utils/common';

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
    return (
        <div className="relative w-full overflow-auto">
            <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
        </div>
    );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return <thead className={cn('[&_tr]:border-b [&_tr]:border-border', className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableFooter({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return <tfoot className={cn('bg-muted/50 font-medium', className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
    return (
        <tr className={cn('border-b border-border transition-colors hover:bg-muted/50', className)} {...props} />
    );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
    return (
        <th
            className={cn(
                'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
                className,
            )}
            {...props}
        />
    );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
    return <td className={cn('p-4 align-middle', className)} {...props} />;
}

export function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
    return (
        <caption className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
    );
}


