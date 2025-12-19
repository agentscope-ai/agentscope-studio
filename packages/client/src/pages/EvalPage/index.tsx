import { Layout } from 'antd';
import { memo } from 'react';
import { Route, Routes } from 'react-router-dom';

import OverviewPage from '@/pages/EvalPage/OverviewPage';
import TaskDetailPage from '@/pages/EvalPage/TaskDetailPage';
import EvaluationPage from '@/pages/EvalPage/EvaluationPage';

import { RouterPath } from '@/pages/RouterPath.ts';
import { EvaluationListContextProvider } from '@/context/EvaluationListContext.tsx';
import { EvaluationContextProvider } from '@/context/EvaluationContext.tsx';

const EvalPage = () => {
    return (
        <Layout className="w-full h-full">
            {/*<TitleBar title={t('common.evaluation')} />*/}

            <Routes>
                <Route
                    index
                    element={
                        <EvaluationListContextProvider>
                            <OverviewPage />
                        </EvaluationListContextProvider>
                    }
                />
                <Route
                    path={RouterPath.EVAL_EVALUATION}
                    element={
                        <EvaluationContextProvider>
                            <EvaluationPage />
                        </EvaluationContextProvider>
                    }
                />
                <Route
                    path={RouterPath.EVAL_TASK}
                    element={<TaskDetailPage />}
                />
            </Routes>
        </Layout>
    );
};
export default memo(EvalPage);
