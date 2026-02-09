import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import { useParams } from 'react-router-dom';
import { EvalResult, Evaluation } from '@shared/types/evaluation.ts';
import { useMessageApi } from '@/context/MessageApiContext.tsx';
import { trpcClient } from '@/api/trpc';
import { EmptyPage } from '@/pages/DefaultPage';

interface EvaluationContextType {
    evaluationId: string;
    evaluation: Evaluation;
    evalResult: EvalResult | undefined;
}

const EvaluationContext = createContext<EvaluationContextType | null>(null);

interface Props {
    children: ReactNode;
}

export function EvaluationContextProvider({ children }: Props) {
    const { evalId: evaluationId } = useParams<{ evalId: string }>();
    const { messageApi } = useMessageApi();
    const [isLoading, setIsLoading] = useState(true);
    const [evaluation, setEvaluation] = useState<Evaluation | undefined>(
        undefined,
    );
    const [evalResult, setEvalResult] = useState<EvalResult | undefined>(
        undefined,
    );

    useEffect(() => {
        if (evaluationId) {
            setIsLoading(true);
            trpcClient.getEvaluationData
                .query({ evaluationId })
                .then((res) => {
                    if (res.success) {
                        setEvaluation(res.data?.evaluation);
                        setEvalResult(res.data?.result);
                    } else {
                        messageApi.error(
                            res.message || 'Failed to get evaluation result.',
                        );
                    }
                })
                .catch((error) => {
                    messageApi.error(
                        error instanceof Error
                            ? error.message
                            : 'Failed to get evaluation result.',
                    );
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
        }
    }, [evaluationId, messageApi]);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex-1 h-full flex items-center justify-center">
                <div className="text-muted-foreground">
                    Loading evaluation...
                </div>
            </div>
        );
    }

    // Check if evaluationId or evaluation is missing
    if (!evaluationId || !evaluation) {
        return (
            <EmptyPage
                title={`Cannot find evaluation ${evaluationId || ''}`}
                size={200}
            />
        );
    }

    return (
        <EvaluationContext.Provider
            value={{
                evaluationId,
                evaluation,
                evalResult,
            }}
        >
            {children}
        </EvaluationContext.Provider>
    );
}

export function useEvaluationContext() {
    const context = useContext(EvaluationContext);
    if (!context) {
        throw new Error(
            'useEvaluationContext must be used within a EvaluationContextProvider',
        );
    }
    return context;
}
