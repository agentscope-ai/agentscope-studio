import { memo } from 'react';

interface Props {
    title: string;
    description?: string;
}

/**
 * Page title text with consistent typography and truncation.
 */
const PageTitleSpan = ({ title, description }: Props) => {
    return (
        <div className="flex flex-col max-w-full truncate">
            <span className="text-2xl font-bold h-8 min-h-8 max-h-8 truncate">
                {title}
            </span>
            <span className="text-muted-foreground h-[21px] truncate max-w-full">
                {description ? description : ''}
            </span>
        </div>
    );
};

export default memo(PageTitleSpan);
