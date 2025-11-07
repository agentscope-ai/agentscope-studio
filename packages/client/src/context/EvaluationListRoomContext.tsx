import { EvaluationMetaData } from '@shared/types';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';

/**
 * Context value shape for the Evaluation list room.
 */
interface EvaluationListRoomContextType {
    evaluationListData: EvaluationMetaData[] | undefined;
    loading: boolean;
}

/**
 * React context that provides evaluation list data and loading state.
 */
const EvaluationListRoomContext =
    createContext<EvaluationListRoomContextType | null>(null);

/**
 * Props for the EvaluationListRoomContextProvider. Supply the current
 * benchmark (or null) and wrap any subtree that needs access to the data.
 */
interface Props {
    benchmark: string | null;
    children: ReactNode;
}

export function EvaluationListRoomContextProvider({
    benchmark,
    children,
}: Props) {
    // Demo placeholder data for evaluations. Replace with server-fetched data
    // when API integration is available.
    const initialData: EvaluationMetaData[] = [
        {
            id: '1',
            name: 'Evaluation 1',
            status: 'running',
            progress: 60,
            createdAt: new Date().toISOString(),
            time: 120441,
            metrics: [
                {
                    name: 'Accuracy',
                    type: 'discrete',
                    enum: ['Low', 'Medium', 'High'],
                },
                {
                    name: 'Response Time',
                    type: 'discrete',
                    enum: [100, 200, 300],
                },
            ],
            repeat: 3,
            report_dir: '',
        },
        {
            id: '2',
            name: 'Evaluation 2',
            status: 'done',
            progress: 60,
            createdAt: new Date().toISOString(),
            time: 120441,
            metrics: [
                {
                    name: 'Accuracy',
                    type: 'discrete',
                    enum: ['Low', 'Medium', 'High'],
                },
                {
                    name: 'Response Time',
                    type: 'discrete',
                    enum: [100, 200, 300],
                },
            ],
            repeat: 3,
            report_dir: '',
        },
        {
            id: '2',
            name: 'Evaluation 2',
            status: 'pending',
            progress: 60,
            createdAt: new Date().toISOString(),
            time: 120441,
            metrics: [
                {
                    name: 'Accuracy',
                    type: 'discrete',
                    enum: ['Low', 'Medium', 'High'],
                },
                {
                    name: 'Response Time',
                    type: 'discrete',
                    enum: [100, 200, 300],
                },
            ],
            repeat: 3,
            report_dir: '',
        },
        {
            id: '2',
            name: 'Evaluation 2',
            status: 'unknown',
            progress: 60,
            createdAt: new Date().toISOString(),
            time: 120441,
            metrics: [
                {
                    name: 'Accuracy',
                    type: 'discrete',
                    enum: ['Low', 'Medium', 'High'],
                },
                {
                    name: 'Response Time',
                    type: 'discrete',
                    enum: [100, 200, 300],
                },
            ],
            repeat: 3,
            report_dir: '',
        },
    ];

    // Holds the list of evaluations for the current benchmark context.
    const [evaluationListData] = useState<EvaluationMetaData[] | undefined>(
        initialData,
    );
    // Loading flag for async fetching lifecycle.
    const [loading] = useState<boolean>(false);

    useEffect(() => {
        // TODO: Fetch evaluation list for the given benchmark and update state.
        // Keep memoized inputs minimal and handle cancellation on rapid changes.
    }, [benchmark]);

    return (
        <EvaluationListRoomContext.Provider
            value={{ evaluationListData, loading }}
        >
            {children}
        </EvaluationListRoomContext.Provider>
    );
}

/**
 * Hook to access evaluation list data and loading state.
 * Must be used within an EvaluationListRoomContextProvider.
 */
export function useEvaluationListRoom() {
    const context = useContext(EvaluationListRoomContext);
    if (!context) {
        throw new Error(
            'useEvaluationListRoom must be used within an EvaluationListRoomContextProvider',
        );
    }
    return context;
}
