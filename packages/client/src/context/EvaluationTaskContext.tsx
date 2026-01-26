import { trpcClient } from '@/api/trpc';
import { useMessageApi } from '@/context/MessageApiContext.tsx';
import { EvalTask } from '@shared/types/evaluation.ts';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import { useParams } from 'react-router-dom';

interface EvaluationTaskContextType {
    task: EvalTask;
}

const EvaluationTaskContext = createContext<EvaluationTaskContextType | null>(
    null,
);

interface Props {
    children: ReactNode;
}

export function EvaluationTaskContextProvider({ children }: Props) {
    const { evalId: evaluationId, taskId } = useParams<{
        evalId: string;
        taskId: string;
    }>();
    const { messageApi } = useMessageApi();
    const [isLoading, setIsLoading] = useState(true);
    const [evalTask, setEvalTask] = useState<EvalTask | null>(null);

    useEffect(() => {
        if (evaluationId && taskId) {
            setIsLoading(true);
            trpcClient.getEvaluationTask
                .query({ evaluationId, taskId })
                .then((res) => {
                    setEvalTask(res);
                    setIsLoading(false);
                })
                .catch((error) => {
                    messageApi.error(
                        error instanceof Error
                            ? error.message
                            : `Failed to get evaluation task: ${error}`,
                    );
                    setIsLoading(false);
                });
        }
    }, [taskId, evaluationId, messageApi]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!evalTask) {
        return <div>Task not found</div>;
    }

    return (
        <EvaluationTaskContext.Provider
            value={{
                task: evalTask,
            }}
        >
            {children}
        </EvaluationTaskContext.Provider>
    );
}

export function useEvaluationTaskContext() {
    const context = useContext(EvaluationTaskContext);
    if (!context) {
        throw new Error(
            'useEvaluationTaskContext must be used within a EvaluationTaskProvider',
        );
    }
    return context;
}
