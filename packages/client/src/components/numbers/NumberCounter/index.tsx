import { CSSProperties, memo } from 'react';
import { Flex } from 'antd';
import SlotCounter from 'react-slot-counter';

/**
 * Props for animated number counter.
 * `number` is displayed with thousand separators; optional `style` applies to wrapper.
 */
interface Props {
    number: number | undefined | null;
    style?: CSSProperties;
}

/**
 * Animated numeric display based on react-slot-counter.
 * Starts from 0 once and animates to the given number.
 */
const NumberCounter = ({ number, style = {} }: Props) => {
    // Ensure we have a valid number, default to 0 if undefined/null/NaN
    const validNumber =
        typeof number === 'number' && !isNaN(number) ? number : 0;

    return (
        <Flex style={{ ...style }} align="center">
            <SlotCounter
                startValue={0}
                startValueOnce
                value={validNumber.toLocaleString()}
                sequentialAnimationMode
                // useMonospaceWidth
            />
        </Flex>
    );
};

export default memo(NumberCounter);
