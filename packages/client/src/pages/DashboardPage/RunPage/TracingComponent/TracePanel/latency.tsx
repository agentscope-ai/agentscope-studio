import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import NumberCounter from '@/components/numbers/NumberCounter';

interface LatencyProps {
    latency: number | undefined;
}

const MILLISECONDS_THRESHOLD = 1000;

const formatLatencyValue = (latency: number) => {
    if (latency > MILLISECONDS_THRESHOLD) {
        return {
            value: Number((latency / MILLISECONDS_THRESHOLD).toFixed(2)),
            unit: 'unit.second',
        };
    }
    return {
        value: Number(latency.toFixed(1)),
        unit: 'unit.microseconds',
    };
};

const Latency = ({ latency = 0 }: LatencyProps) => {
    const { t } = useTranslation();
    const { value, unit } = formatLatencyValue(latency);

    return (
        <div className="flex font-bold text-[13px] w-fit items-center">
            <NumberCounter number={value} style={{ paddingBottom: 1 }} />
            {t(unit)}
        </div>
    );
};

export default memo(Latency);
