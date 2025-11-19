import { CSSProperties, memo } from 'react';
import { Flex } from 'antd';
import SlotCounter from 'react-slot-counter';

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
    return (
        <Flex style={{ ...style }} align="center">
            <SlotCounter
                startValue={0}
                startValueOnce
                value={number.toLocaleString()}
                sequentialAnimationMode
                // useMonospaceWidth
            />
        </Flex>
    );
};

export default memo(NumberCounter);
