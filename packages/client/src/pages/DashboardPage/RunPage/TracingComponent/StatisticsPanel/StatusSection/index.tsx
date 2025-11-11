import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Status } from '@shared/types/messageForm';
import NumberCounter from '@/components/numbers/NumberCounter';

interface Props {
    status: string | undefined;
    invocations: number | undefined;
    tokens: number | undefined;
}

const StatusSection = ({ status, invocations, tokens }: Props) => {
    const { t } = useTranslation();

    const renderStatusTitleRow = (
        title1: string,
        title2: string,
        title3: string,
    ) => {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="w-full text-[12px] font-semibold text-[var(--muted-foreground)] truncate">
                    {title1.toUpperCase()}
                </div>
                <div className="w-full text-[12px] font-semibold text-[var(--muted-foreground)] truncate">
                    {title2.toUpperCase()}
                </div>
                <div className="w-full text-[12px] font-semibold text-[var(--muted-foreground)] truncate">
                    {title3.toUpperCase()}
                </div>
            </div>
        );
    };

    const renderStatusValueRow = (
        value1: string | undefined,
        value2: number | undefined,
        value3: number | undefined,
    ) => {
        const status = value1 ? t(`status.${value1}`) : Status.UNKNOWN;

        const unitString2 =
            value2 && value2 > 1 ? t('unit.times') : t('unit.time');
        const unitString3 =
            value3 && value3 > 1 ? t('unit.tokens') : t('unit.token');

        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="overflow-hidden h-6">
                    <div className="w-full h-6 flex items-center font-bold text-[13px] text-[var(--foreground)] truncate">
                        {status.toUpperCase()}
                    </div>
                </div>
                <div className="overflow-hidden h-6">
                    <div className="w-full h-6 flex items-center font-bold text-[13px] text-[var(--foreground)] truncate">
                        <NumberCounter number={value2 ? value2 : 0} />
                        <span className="ml-1">{unitString2}</span>
                    </div>
                </div>
                <div className="overflow-hidden h-6">
                    <div className="w-full h-6 flex items-center font-bold text-[13px] text-[var(--foreground)] truncate">
                        <NumberCounter number={value3 ? value3 : 0} />
                        <span className="ml-1">{unitString3}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full rounded-md p-4 space-y-2 border-2 border-[var(--primary)] shadow-[var(--box-shadow)]">
            {renderStatusTitleRow(
                t('common.status'),
                t('common.llm-invocations'),
                t('common.total-tokens'),
            )}
            {renderStatusValueRow(status, invocations, tokens)}
        </div>
    );
};

export default memo(StatusSection);
