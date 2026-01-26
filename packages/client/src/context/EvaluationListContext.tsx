import { trpc, trpcClient } from '@/api/trpc.ts';
import { useMessageApi } from '@/context/MessageApiContext.tsx';
import { TableRequestParams } from '@shared/types';
import { Evaluation } from '@shared/types/evaluation.ts';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';

interface EvaluationListContextType {
    tableDataSource: Evaluation[];
    tableLoading: boolean;
    tableRequestParams: TableRequestParams;
    setTableRequestParams: (
        updateFn: (params: TableRequestParams) => TableRequestParams,
    ) => void;
    total: number;
    deleteEvaluations: (evaluationIds: string[]) => void;
    importEvaluation: (evaluationDir: string) => Promise<boolean>;
}

const EvaluationListContext = createContext<EvaluationListContextType | null>(
    null,
);

interface Props {
    children: ReactNode;
    pollingInterval?: number;
    pollingEnabled?: boolean;
}

export function EvaluationListContextProvider({
    children,
    pollingInterval = 10000,
    pollingEnabled = true,
}: Props) {
    const { messageApi } = useMessageApi();
    const [tableRequestParams, setTableRequestParams] =
        useState<TableRequestParams>({
            pagination: {
                page: 1,
                pageSize: 50,
            },
        });

    const {
        data: response,
        isLoading,
        error,
        refetch,
    } = trpc.getEvaluations.useQuery(tableRequestParams, {
        refetchInterval: pollingEnabled ? pollingInterval : false,
        refetchIntervalInBackground: false,
        staleTime: 0,
    });

    useEffect(() => {
        if (error) {
            messageApi.error(`Failed to load evaluations: ${error.message}`);
        }
    }, [error]);

    const deleteEvaluations = async (evaluationIds: string[]) => {
        try {
            const res = await trpcClient.deleteEvaluations.mutate({
                evaluationIds,
            });
            if (res.success) {
                messageApi.success(res.message);
                // fetch the updated list
                refetch();
            } else {
                messageApi.error(res.message);
            }
        } catch (error) {
            messageApi.error((error as Error).message.toString());
        }
    };

    const importEvaluation = async (evaluationDir: string) => {
        try {
            const result = await trpcClient.importEvaluation.mutate({
                evaluationDir,
            });
            if (result.success) {
                refetch();
                return true;
            } else {
                messageApi.error(result.message);
                return false;
            }
        } catch (error) {
            messageApi.error((error as Error).message);
            return false;
        }
    };

    return (
        <EvaluationListContext.Provider
            value={{
                tableDataSource: response?.data?.list || [],
                tableLoading: isLoading,
                total: response?.data?.total || 0,
                tableRequestParams,
                setTableRequestParams,
                deleteEvaluations,
                importEvaluation,
            }}
        >
            {children}
        </EvaluationListContext.Provider>
    );
}

export function useEvaluationList() {
    const context = useContext(EvaluationListContext);
    if (!context) {
        throw new Error(
            'useEvaluationList must be used within an EvaluationListContextProvider',
        );
    }
    return context;
}
