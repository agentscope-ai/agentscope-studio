import { trpc, trpcClient } from '@/api/trpc';
import { useMessageApi } from '@/context/MessageApiContext.tsx';
import { TableRequestParams } from '@shared/types';
import { EvalTaskMeta } from '@shared/types/evaluation.ts';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';

interface EvaluationTasksContextType {
    tableDataSource: EvalTaskMeta[];
    tableLoading: boolean;
    total: number;
    tableRequestParams: TableRequestParams;
    setTableRequestParams: (
        updateFn: (params: TableRequestParams) => TableRequestParams,
    ) => void;
    tags: { tag: string; cnt: number }[];
}

const EvaluationTasksContext = createContext<EvaluationTasksContextType | null>(
    null,
);

interface Props {
    evaluationId: string;
    children: ReactNode;
    pollingInterval?: number;
    pollingEnabled?: boolean;
}

export function EvaluationTasksContextProvider({
    evaluationId,
    children,
    pollingInterval = 10000,
    pollingEnabled = false,
}: Props) {
    const [tableRequestParams, setTableRequestParams] =
        useState<TableRequestParams>({
            pagination: {
                page: 1,
                pageSize: 10,
            },
        });
    const [tags, setTags] = useState<{ tag: string; cnt: number }[]>([]);
    const { messageApi } = useMessageApi();

    // Initialize the tags
    useEffect(() => {
        trpcClient.getEvaluationTags
            .query({ evaluationId })
            .then((res) => {
                setTags(res);
            })
            .catch((error) => {
                messageApi.error(error);
            });
    }, [evaluationId, messageApi]);

    const { data: response, isLoading } = trpc.getEvaluationTasks.useQuery(
        { ...tableRequestParams, evaluationId },
        {
            refetchInterval: pollingEnabled ? pollingInterval : false,
            refetchIntervalInBackground: false,
            staleTime: 0,
        },
    );

    return (
        <EvaluationTasksContext.Provider
            value={{
                tags,
                tableDataSource: response?.list || [],
                tableLoading: isLoading,
                total: response?.total || 0,
                tableRequestParams,
                setTableRequestParams,
            }}
        >
            {children}
        </EvaluationTasksContext.Provider>
    );
}

export function useEvaluationTasksContext() {
    const context = useContext(EvaluationTasksContext);
    if (!context) {
        throw new Error(
            'useEvaluationTasksContext must be used within a EvaluationTasksContextProvider',
        );
    }
    return context;
}
