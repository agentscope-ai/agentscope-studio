import { memo } from 'react';

/**
 * Page title text with consistent typography and truncation.
 */
const PageTitleSpan = ({ title }: { title: string }) => {
    return (
        <span className="text-2xl font-bold h-8 min-h-8 max-h-8 truncate">
            {title}
        </span>
    );
};

export default memo(PageTitleSpan);
