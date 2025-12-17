import { memo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import WipIcon from '@/assets/svgs/page-wip.svg?react';
import EmptyIcon from '@/assets/svgs/page-empty.svg?react';
import NotFoundIcon from '@/assets/svgs/page-notFound.svg?react';

interface Props {
    icon: ReactNode;
    title: string;
}

const BaseDefaultPage = ({ icon, title }: Props) => {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full">
            {icon}
            <div className="text-primary/40 text-sm">{title}</div>
        </div>
    );
};

export const ProjectNotFoundPage = memo(() => {
    const { t } = useTranslation();

    return (
        <BaseDefaultPage
            icon={<NotFoundIcon width={350} height={350} />}
            title={t('error.project-not-found')}
        />
    );
});

export const RunNotFoundPage = memo(() => {
    const { t } = useTranslation();

    return (
        <BaseDefaultPage
            icon={<NotFoundIcon width={350} height={350} />}
            title={t('error.run-not-found')}
        />
    );
});

export const EmptyRunPage = memo(() => {
    const { t } = useTranslation();

    return (
        <BaseDefaultPage
            icon={<EmptyIcon width={350} height={350} />}
            title={t('hint.select-run')}
        />
    );
});

export const EmptyMessagePage = memo(() => {
    const { t } = useTranslation();

    return (
        <BaseDefaultPage
            icon={<EmptyIcon width={150} height={150} />}
            title={t('hint.select-message')}
        />
    );
});

export const EmptyTracePage = memo(() => {
    const { t } = useTranslation();

    return (
        <BaseDefaultPage
            icon={<EmptyIcon width={150} height={150} />}
            title={t('hint.select-trace')}
        />
    );
});

export const WipPage = memo(() => {
    return (
        <BaseDefaultPage
            icon={<WipIcon width={250} height={250} />}
            title="Coming soon ..."
        />
    );
});

export const EmptyPage = memo(
    ({ size, title }: { size: number; title: string }) => {
        return (
            <BaseDefaultPage
                icon={<EmptyIcon width={size} height={size} />}
                title={title}
            />
        );
    },
);
