/**
 * HighlightGroup Component
 *
 * A mouse-tracking highlight effect component that provides dynamic highlight effects for card-style layouts.
 * When the mouse moves within the group, it displays a radial gradient highlight border at the card edges based on the mouse position.
 *
 * Features:
 * - Multi-card linkage: All HighlightCards within HighlightGroup display highlights with different opacity based on mouse distance
 * - Customizable highlight radius: Control the influence range of highlight effect through the radius property
 * - Standalone usage: HighlightCard can be used independently without HighlightGroup
 *
 * Usage Example:
 * ```tsx
 * <HighlightGroup radius={180}>
 *   <HighlightCard>Card Content 1</HighlightCard>
 *   <HighlightCard>Card Content 2</HighlightCard>
 * </HighlightGroup>
 * ```
 *
 * @module components/highlight
 */

import {
    createContext,
    HTMLAttributes,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
} from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import './index.css';

/**
 * HighlightGroup context value type
 * Used to share card registration logic between HighlightGroup and HighlightCard
 */
interface HighlightGroupContextValue {
    /** Register a card to the group */
    registerCard: (card: HTMLDivElement) => void;
    /** Unregister a card from the group */
    unregisterCard: (card: HTMLDivElement) => void;
}

/**
 * HighlightGroup context
 * Used to manage registration and linkage effects of all cards in the group
 */
const HighlightGroupContext = createContext<HighlightGroupContextValue | null>(
    null,
);

/**
 * HighlightGroup component props
 */
interface HighlightGroupProps extends HTMLAttributes<HTMLDivElement> {
    /** Influence radius of the highlight effect (in pixels), default is 140px */
    radius?: number;
}

/**
 * HighlightGroup Component
 *
 * Provides a container that manages the linkage highlight effects of all internal HighlightCards.
 * When the mouse moves within the group, it dynamically adjusts the highlight intensity of each card based on the distance between the mouse and each card.
 *
 * @param props - Component properties
 * @returns React component
 */
const HighlightGroup = ({
    children,
    className = '',
    radius = 140,
    onMouseMove,
    onMouseLeave,
    ...rest
}: HighlightGroupProps) => {
    /** Store all registered card elements in the group */
    const cardsRef = useRef(new Set<HTMLDivElement>());

    /**
     * Register a card to the group
     * Add the card to the management list and initialize its highlight opacity
     */
    const registerCard = useCallback((card: HTMLDivElement) => {
        cardsRef.current.add(card);
        card.style.setProperty('--cursor-opacity', '0');
    }, []);

    /**
     * Unregister a card from the group
     * Called when the card component is unmounted
     */
    const unregisterCard = useCallback((card: HTMLDivElement) => {
        cardsRef.current.delete(card);
    }, []);

    const contextValue = useMemo(
        () => ({
            registerCard,
            unregisterCard,
        }),
        [registerCard, unregisterCard],
    );

    /**
     * Update highlight effects of all cards
     * Calculate the highlight intensity and position for each card based on mouse position
     *
     * Algorithm:
     * 1. Clamp mouse coordinates within card boundaries (clampedX/Y)
     * 2. Calculate the shortest distance from mouse to card (dx/dy/distance)
     * 3. Calculate opacity based on distance and radius (closer means brighter)
     * 4. Update card's CSS variables to apply highlight effect
     */
    const updateCards = useCallback(
        (event: ReactMouseEvent<HTMLDivElement>) => {
            cardsRef.current.forEach((card) => {
                // Get card's position and dimensions
                const rect = card.getBoundingClientRect();

                // Clamp mouse coordinates within card boundaries
                const clampedX = Math.min(
                    Math.max(event.clientX - rect.left, 0),
                    rect.width,
                );
                const clampedY = Math.min(
                    Math.max(event.clientY - rect.top, 0),
                    rect.height,
                );

                // Calculate distance from mouse to card boundaries
                const dx =
                    event.clientX < rect.left
                        ? rect.left - event.clientX
                        : event.clientX > rect.right
                          ? event.clientX - rect.right
                          : 0;
                const dy =
                    event.clientY < rect.top
                        ? rect.top - event.clientY
                        : event.clientY > rect.bottom
                          ? event.clientY - rect.bottom
                          : 0;

                // Calculate distance and opacity (farther distance results in lower opacity)
                const distance = Math.sqrt(dx * dx + dy * dy);
                const opacity = Math.max(0, 1 - distance / radius);

                // Calculate percentage position of the highlight
                const x = (clampedX / rect.width) * 100;
                const y = (clampedY / rect.height) * 100;

                // Update card's CSS variables
                card.style.setProperty('--cursor-x', `${x}%`);
                card.style.setProperty('--cursor-y', `${y}%`);
                card.style.setProperty('--cursor-opacity', String(opacity));
            });
        },
        [radius],
    );

    /**
     * Mouse move event handler
     * Update highlight effects for all cards and call the external onMouseMove
     */
    const handleMouseMove = useCallback(
        (event: ReactMouseEvent<HTMLDivElement>) => {
            updateCards(event);
            onMouseMove?.(event);
        },
        [updateCards, onMouseMove],
    );

    /**
     * Mouse leave event handler
     * Reset highlight effects for all cards and call the external onMouseLeave
     */
    const handleMouseLeave = useCallback(
        (event: ReactMouseEvent<HTMLDivElement>) => {
            cardsRef.current.forEach((card) => {
                card.style.setProperty('--cursor-opacity', '0');
            });
            onMouseLeave?.(event);
        },
        [onMouseLeave],
    );

    return (
        <HighlightGroupContext.Provider value={contextValue}>
            <div
                className={className}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                {...rest}
            >
                {children}
            </div>
        </HighlightGroupContext.Provider>
    );
};

/**
 * HighlightCard component props
 * Inherits all standard HTML attributes of div element
 */
interface HighlightCardProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * HighlightCard Component
 *
 * A card component with mouse-tracking highlight effect.
 *
 * Usage:
 * 1. Inside HighlightGroup: The card automatically registers to the group and enjoys linkage highlight effects
 * 2. Standalone use: The card independently responds to mouse events and displays highlight effects
 *
 * @param props - Component properties
 * @returns React component
 */
const HighlightCard = ({
    children,
    className = '',
    onMouseMove,
    onMouseEnter,
    onMouseLeave,
    ...rest
}: HighlightCardProps) => {
    /** Card DOM element reference */
    const cardRef = useRef<HTMLDivElement>(null);
    /** Get parent HighlightGroup's context (if exists) */
    const groupContext = useContext(HighlightGroupContext);

    /**
     * Register the card to parent HighlightGroup
     * Only executes when the card is contained within HighlightGroup
     */
    useEffect(() => {
        if (!groupContext || !cardRef.current) {
            return;
        }
        const element = cardRef.current;
        // Register when component mounts
        groupContext.registerCard(element);
        // Unregister when component unmounts
        return () => {
            groupContext.unregisterCard(element);
        };
    }, [groupContext]);

    /**
     * Update mouse position (only when used standalone)
     * Calculate the relative position of the mouse within the card and update the highlight effect
     */
    const updateMousePosition = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        // Calculate the percentage position of the mouse within the card
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        // Update CSS variables to display highlight
        cardRef.current.style.setProperty('--cursor-x', `${x}%`);
        cardRef.current.style.setProperty('--cursor-y', `${y}%`);
        cardRef.current.style.setProperty('--cursor-opacity', '1');
    };

    /**
     * Mouse move event handler
     * If not inside HighlightGroup, independently update highlight position
     */
    const handleMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (!groupContext) {
            updateMousePosition(event);
        }
        onMouseMove?.(event);
    };

    /**
     * Mouse enter event handler
     * If not inside HighlightGroup, independently show highlight effect
     */
    const handleMouseEnter = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (!groupContext) {
            updateMousePosition(event);
        }
        onMouseEnter?.(event);
    };

    /**
     * Mouse leave event handler
     * If not inside HighlightGroup, independently reset highlight effect
     */
    const handleMouseLeave = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (!groupContext && cardRef.current) {
            // Reset highlight position to center and hide highlight
            cardRef.current.style.setProperty('--cursor-x', '50%');
            cardRef.current.style.setProperty('--cursor-y', '50%');
            cardRef.current.style.setProperty('--cursor-opacity', '0');
        }
        onMouseLeave?.(event);
    };

    return (
        <div
            ref={cardRef}
            className={`as-highlight-card ${className}`}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...rest}
        >
            {children}
        </div>
    );
};

export { HighlightGroup, HighlightCard };
