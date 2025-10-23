import { Layout } from 'antd';
import { memo } from 'react';
import { Route, Routes } from 'react-router-dom';
import ComparisonPage from '@/pages/EvalPage/TaskComparisonPage';
import OverviewPage from '@/pages/EvalPage/OverviewPage';
import { EvaluationRoomContextProvider } from '@/context/EvaluationRoomContext';
import { RouterPath } from '@/pages/RouterPath.ts';
import TaskDetailPage from '@/pages/EvalPage/TaskDetailPage';
import EvaluationDetailPage from './EvaluationDetailPage';


const EvalPage = () => {
    return (
        <Layout className="w-full h-full">
            {/*<TitleBar title={t('common.evaluation')} />*/}

            <EvaluationRoomContextProvider>
                <Routes>
                    <Route
                        index
                        element={<OverviewPage />}
                    />
                    <Route
                        path={RouterPath.EVAL_EVALUATION}
                        element={<EvaluationDetailPage />}
                    />
                    <Route
                        path={RouterPath.EVAL_TASK}
                        element={<TaskDetailPage />}
                    />
                    {/*<Route*/}
                    {/*    path={'/eval/:evalId/compare/'}*/}
                    {/*    element={<ComparisonPage />}*/}
                    {/*/>*/}
                </Routes>
            </EvaluationRoomContextProvider>
        </Layout>
    );
};

export default memo(EvalPage);
