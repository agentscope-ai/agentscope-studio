import { Button } from '@/components/ui/button.tsx';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import { ComponentProps, memo, useRef } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip.tsx';

interface Props extends ComponentProps<'button'> {
    animationData: unknown;
    tooltip: string;
    [key: string]: unknown;
}

const AsLottieButton = ({
    animationData,
    tooltip,
    onClick,
    ...rest
}: Props) => {
    // ref to control the lottie animation instance
    const lottieRef = useRef<LottieRefCurrentProps | null>(null);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    {...rest}
                    onClick={(e) => {
                        onClick?.(e);

                        // TODO: Add sound effect here
                        const ref = lottieRef.current;
                        if (!ref) return;
                        ref.setSpeed(2.5);
                        ref.goToAndPlay(0, true);
                    }}
                >
                    <Lottie
                        className="size-5.5"
                        lottieRef={lottieRef}
                        animationData={animationData}
                        autoplay={false}
                        loop={false}
                    />
                </Button>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
    );
};

export default memo(AsLottieButton);
