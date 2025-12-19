import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import { useParams } from 'react-router-dom';
import { EvalResult, EvalTaskMeta, Evaluation } from '@shared/types/evaluation.ts';
import { TableRequestParams } from '@shared/types';
import { useMessageApi } from '@/context/MessageApiContext.tsx';
import { trpc, trpcClient } from '@/api/trpc';
import { EmptyPage } from '@/pages/DefaultPage';

interface EvaluationContextType {
    tableDataSource: EvalTaskMeta[];
    tableLoading: boolean;
    total: number;
    tableRequestParams: TableRequestParams;
    setTableRequestParams: (
        updateFn: (params: TableRequestParams) => TableRequestParams,
    ) => void;
    evaluation: Evaluation;
    evalResult: EvalResult | undefined;
}

const EvaluationContext = createContext<EvaluationContextType | null>(null);

interface Props {
    children: ReactNode;
    pollingInterval?: number;
    pollingEnabled?: boolean;
}

export function EvaluationContextProvider({
    children,
    pollingInterval = 10000,
    pollingEnabled = true,
}: Props) {
    const { evalId: evaluationId } = useParams<{ evalId: string }>();
    const { messageApi } = useMessageApi();
    const [tableRequestParams, setTableRequestParams] =
        useState<TableRequestParams>({
            pagination: {
                page: 1,
                pageSize: 50,
            },
        });
    const [evaluation, setEvaluation] = useState<Evaluation | undefined>(undefined);
    const [evalResult, setEvalResult] = useState<EvalResult | undefined>(undefined);

    useEffect(() => {
        if (evaluationId) {
            trpcClient.getEvaluationData.query({ evaluationId })
                .then(
                    res => {
                        if (res.success) {
                            setEvaluation(res.data?.evaluation);
                            setEvalResult(res.data?.result);
                        } else {
                            messageApi.error(
                                res.message || 'Failed to get evaluation result.',
                            );
                        }
                    }
                )
                .catch(
                    error => {
                        messageApi.error(
                            error instanceof Error
                                ? error.message
                                : 'Failed to get evaluation result.',
                        );
                    }
                )
        }
    });

    if (!evaluationId || !evaluation) {
        return <EmptyPage
            title={`Cannot find evaluation ${evaluationId}`}
            size={30}
        />;
    }

    const {
        data: response,
        isLoading,
        refetch,
    } = trpc.getEvaluationTasks.useQuery(
        { ...tableRequestParams, evaluationId },
        {
            refetchInterval: pollingEnabled ? pollingInterval : false,
            refetchIntervalInBackground: false,
            staleTime: 0,
        },
    );

    /**
     * Update query params and reset polling timer
     *
     * @param updateFn - Function to update the current TableRequestParams
     */
    const handleUpdateTableRequestParams = (
        updateFn: (params: TableRequestParams) => TableRequestParams,
    ) => {
        setTableRequestParams((prevParams) => {
            return updateFn(prevParams);
        });
        refetch();
    };

    return (
        <EvaluationContext.Provider
            value={{
                tableDataSource: response.data?.list || [],
                tableLoading: isLoading,
                total: response?.data?.total || 0,
                tableRequestParams,
                setTableRequestParams: handleUpdateTableRequestParams,
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
