import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { Tour } from 'antd';

import { TourStepProps } from 'antd/es/tour/interface';

/**
 * Shape of the context exposed by TourContext.
 * Currently only exposes a registrar to append steps for the Run page tour.
 */
interface TourContextType {
    registerRunPageTourStep: (step: TourStepProps) => void;
}

const TourContext = createContext<TourContextType | null>(null);

/**
 * Props for the provider. Wrap any subtree that needs access to the Tour API.
 */
interface Props {
    children: ReactNode;
}

export function TourContextProvider({ children }: Props) {
    // Whether the Run page tour has been played before. Persisted in localStorage
    // to avoid showing the tour again on subsequent visits.
    const [runPageTourPlayed, setRunPageTourPlayed] = useState<boolean>(
        localStorage.getItem('runPageTourPlayed') !== null,
    );
    const onRunPageTourClose = () => {
        // Mark the tour as played when user closes it.
        localStorage.setItem('runPageTourPlayed', 'true');
        setRunPageTourPlayed(true);
    };

    // Collected steps for the Run page tour. Steps are registered from different
    // components via the context API and then rendered together here.
    const [runPageTourSteps, setRunPageTourSteps] = useState<TourStepProps[]>(
        [],
    );

    // We consider the tour ready only after at least 4 steps are registered.
    // This prevents flashing an incomplete tour while the UI mounts.
    const runPageTourReady = useMemo(
        () => runPageTourSteps.length >= 4,
        [runPageTourSteps],
    );

    const registerRunPageTourStep = (step: TourStepProps) => {
        setRunPageTourSteps((prevSteps) => {
            const prevTitles = prevSteps.map((step) => step.title);
            if (prevTitles.includes(step.title)) {
                return prevSteps;
            }
            return [...prevSteps, step];
        });
    };

    return (
        <TourContext.Provider
            value={{
                registerRunPageTourStep,
            }}
        >
            {children}
            <Tour
                open={runPageTourReady && !runPageTourPlayed}
                onClose={onRunPageTourClose}
                steps={runPageTourSteps}
            />
        </TourContext.Provider>
    );
}

/**
 * Hook to access the Tour API. Must be used within a TourContextProvider.
 */
export function useTour() {
    const context = useContext(TourContext);
    if (!context) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
}
