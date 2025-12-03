import { createContext, ReactNode, useContext, useState } from 'react';
import { EvaluationData } from '@shared/types';

interface EvaluationRoomContextType {
    evaluationData: EvaluationData | null;
    loading: boolean;
}

const EvaluationRoomContext = createContext<EvaluationRoomContextType | null>(
    null,
);

interface Props {
    children: ReactNode;
}

export function EvaluationRoomContextProvider({ children }: Props) {
    const initialState: EvaluationData = {
        id: '2',
        name: 'Evaluation 2',
        status: 'pending',
        benchmark: 'GAIA',
        progress: 60,
        createdAt: new Date().toISOString(),
        time: 120441,
        metrics: [
            {
                name: 'Accuracy',
                type: 'discrete',
                enum: ['Low', 'Medium', 'High'],
            },
            { name: 'Response Time', type: 'discrete', enum: [100, 200, 300] },
        ],
        repeat: 3,
        results: {},
        report_dir: '',
    };

    const [evaluationData] = useState<EvaluationData | null>(initialState);
    const [loading] = useState<boolean>(false);

    return (
        <EvaluationRoomContext.Provider value={{ loading, evaluationData }}>
            {children}
        </EvaluationRoomContext.Provider>
    );
}

export function useEvaluationRoom() {
    const context = useContext(EvaluationRoomContext);
    if (!context) {
        throw new Error(
            'useEvaluationRoom must be used within an EvaluationRoomContextProvider',
        );
    }
    return context;
}
