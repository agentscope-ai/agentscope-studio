import { useEffect, useRef } from 'react';
import { Tabs } from 'antd';

import ReplyPanel from './ReplyPanel';
import TracePanel from './TracePanel';
import StatisticsPanel from './StatisticsPanel';

import { useTranslation } from 'react-i18next';
import { useTour } from '@/context/TourContext.tsx';
import { Reply } from '@shared/types';

interface Props {
    activateTab: string;
    onTabChange: (key: string) => void;
    reply: Reply | null;
}

const TracingComponent = ({ activateTab, onTabChange, reply }: Props) => {
    const { t } = useTranslation();
    const { registerRunPageTourStep } = useTour();
    const refView = useRef(null);

    useEffect(() => {
        registerRunPageTourStep({
            title: t('tour.run.data-view-title'),
            description: t('tour.run.data-view-description'),
            target: refView.current,
            placement: 'right',
        });
    }, []);

    const renderTabLabel = (label: string) => {
        return (
            <span style={{ fontWeight: 500, fontSize: 12 }}>
                {label.toUpperCase()}
            </span>
        );
    };

    const items = [
        {
            key: 'statistics',
            label: renderTabLabel(t('common.run')),
            children: <StatisticsPanel />,
        },
        {
            key: 'message',
            label: renderTabLabel(t('common.message')),
            children: <ReplyPanel reply={reply} />,
        },
        {
            key: 'trace',
            label: renderTabLabel(t('common.trace')),
            children: <TracePanel />,
        },
    ];

    return (
        <div className="flex flex-col h-full w-full">
            <div className="text-sm font-medium p-4">
                {t('common.data-view')}
                <div className="text-[12px] text-muted-foreground truncate break-all">
                    {t('common.data-view-description')}
                </div>
            </div>
            <div ref={refView} className="w-full overflow-hidden flex-1">
                <Tabs
                    className="w-full h-full [&_.ant-tabs-content]:h-full"
                    activeKey={activateTab}
                    items={items}
                    size="small"
                    onChange={onTabChange}
                />
            </div>
        </div>
    );
};

export default TracingComponent;
