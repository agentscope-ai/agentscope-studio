import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsLeftIcon,
    ChevronsRightIcon,
} from 'lucide-react';

interface Props {
    total: number;
    pageTotal: number;
    nSelectedRows: number;
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
}

export const AsPagination = ({
    total,
    pageTotal,
    nSelectedRows,
    page,
    pageSize,
    onPageSizeChange,
    onPageChange,
}: Props) => {
    const totalPages = Math.ceil(total / pageSize) || 1;
    return (
        <div className="flex flex-row text-sm font-medium w-full justify-between items-center">
            <div className="text-sm font-normal text-muted-foreground flex-1 hidden lg:flex pl-1">
                {nSelectedRows} of {Math.min(pageSize, pageTotal)} row(s)
                selected.
            </div>
            <div className="flex flex-row items-center gap-x-8 lg:w-fit w-full">
                <div className="flex-row items-center gap-2 hidden lg:flex">
                    Rows per page
                    <Select
                        value={pageSize.toString()}
                        onValueChange={(value) =>
                            onPageSizeChange(Number(value))
                        }
                    >
                        <SelectTrigger size="sm" className="w-[80px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                Page {page} of {totalPages}
                <div className="flex flex-row gap-x-2 lg:ml-0 ml-auto">
                    <Button
                        className="hidden lg:flex"
                        size="icon-sm"
                        variant="outline"
                        disabled={page === 1}
                        onClick={() => {
                            onPageChange(1);
                        }}
                    >
                        <ChevronsLeftIcon />
                    </Button>
                    <Button
                        size="icon-sm"
                        variant="outline"
                        disabled={page === 1}
                        onClick={() => {
                            onPageChange(page - 1);
                        }}
                    >
                        <ChevronLeftIcon />
                    </Button>
                    <Button
                        size="icon-sm"
                        variant="outline"
                        disabled={page === totalPages}
                        onClick={() => {
                            onPageChange(page + 1);
                        }}
                    >
                        <ChevronRightIcon />
                    </Button>
                    <Button
                        className="hidden lg:flex"
                        size="icon-sm"
                        variant="outline"
                        disabled={page === totalPages}
                        onClick={() => {
                            onPageChange(totalPages);
                        }}
                    >
                        <ChevronsRightIcon />
                    </Button>
                </div>
            </div>
        </div>
    );
};
