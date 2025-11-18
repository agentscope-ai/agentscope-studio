import { ReactNode, RefObject } from 'react';
import { Button, ButtonProps, Tooltip } from 'antd';
import { TooltipPlacement } from 'antd/lib/tooltip';

/**
 * Extended button props that include tooltip and placement configuration.
 */
interface Props extends ButtonProps {
    ref?: RefObject<null> | undefined;
    tooltip: string;
    placement?: TooltipPlacement;
}

/**
 * Secondary button with tooltip support and configurable placement.
 * Uses Ant Design's default type with minimal styling.
 */
const SecondaryButton = ({
    tooltip,
    placement = 'top',
    ...restProps
}: Props) => {
    return (
        <Tooltip title={tooltip} placement={placement}>
            <Button color="default" type="default" {...restProps} />
        </Tooltip>
    );
};

/**
 * Props for the switch button component that toggles between active/inactive states.
 */
interface SwitchButtonProps extends ButtonProps {
    tooltip: string;
    title?: string;
    activeIcon?: ReactNode;
    inactiveIcon?: ReactNode;
    active: boolean;
}

/**
 * Toggle button that switches between active and inactive states.
 * Changes background color, text color, and icon based on the `active` prop.
 */
const SwitchButton = ({
    tooltip,
    title,
    activeIcon,
    inactiveIcon,
    active,
    ...restProps
}: SwitchButtonProps) => {
    // Dynamic styling based on active state
    const bgColor = active ? 'var(--secondary)' : 'transparent';
    const color = active ? 'var(--secondary-foreground)' : 'var(--hint-color)';

    return (
        <Tooltip title={tooltip}>
            <Button
                style={{ background: bgColor, color: color }}
                icon={active ? activeIcon : inactiveIcon}
                className="as-switch-button"
                {...restProps}
            >
                {title}
            </Button>
        </Tooltip>
    );
};

export { SecondaryButton, SwitchButton };
