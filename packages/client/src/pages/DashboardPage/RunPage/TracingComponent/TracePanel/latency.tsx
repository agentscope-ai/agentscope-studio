import NumberCounter from '@/components/numbers/NumberCounter';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

interface LatencyProps {
    latencyNs: number | undefined;
}

function nanoToMilliseconds(nanoTimestamp: string | number): number {
    return Number(nanoTimestamp) / 1_000_000;
}

function nanoToSeconds(nanoTimestamp: string | number): number {
    return Number(nanoTimestamp) / 1_000_000_000;
}

const NANOSECONDS_THRESHOLD = 1_000_000_000;

const formatLatencyValue = (latencyNs: number) => {
    if (latencyNs > NANOSECONDS_THRESHOLD) {
        return {
            value: Number(nanoToSeconds(latencyNs).toFixed(2)),
            unit: 'unit.second',
        };
    }
    return {
        value: Number(nanoToMilliseconds(latencyNs).toFixed(1)),
        unit: 'unit.microseconds',
    };
};

const Latency = ({ latencyNs = 0 }: LatencyProps) => {
    const { t } = useTranslation();
    const { value, unit } = formatLatencyValue(latencyNs);

    return (
        <div className="flex font-bold text-[13px] w-fit items-center">
            <NumberCounter number={value} style={{ paddingBottom: 1 }} />
            {t(unit)}
        </div>
    );
};

export default memo(Latency);
