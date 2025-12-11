import { CSSProperties, memo } from 'react';
import { Flex } from 'antd';
import SlotCounter from 'react-slot-counter';
import { formatNumber } from '@/utils/common';

/**
 * Props for animated number counter.
 * `number` is displayed with thousand separators; optional `style` applies to wrapper.
 */
interface Props {
    number: number;
    style?: CSSProperties;
}

/**
 * Animated numeric display based on react-slot-counter.
 * Starts from 0 once and animates to the given number.
 */
const NumberCounter = ({ number, style = {} }: Props) => {
    const formattedNumber = formatNumber(number);
    const match = formattedNumber.match(/^([0-9,.]+)([KMBT]?)$/);
    const numericPart = match ? match[1] : formattedNumber;
    const unitPart = match ? match[2] : '';
    return (
        <Flex style={{ ...style }} align={'center'}>
            <SlotCounter
                startValue={0}
                startValueOnce
                value={numericPart}
                sequentialAnimationMode
                // useMonospaceWidth
                />
            {unitPart && <span>{unitPart}</span>}
        </Flex>
    );
};

export default memo(NumberCounter);
