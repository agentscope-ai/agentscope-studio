import { EvalTask } from '@shared/types/evaluation.ts';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import { useParams } from 'react-router-dom';
import { useMessageApi } from '@/context/MessageApiContext.tsx';
import { trpcClient } from '@/api/trpc';

interface EvaluationTaskContext {
    task: EvalTask;
}

const EvaluationTaskContext = createContext<EvaluationTaskContext | null>(null);

interface Props {
    children: ReactNode;
}

export function EvaluationTaskContextProvider({ children }: Props) {
    const { evalId: evaluationId, taskId: taskId } = useParams<{
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
        <EvaluationTaskContext
            value={{
                task: evalTask,
            }}
        >
            {children}
        </EvaluationTaskContext>
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
