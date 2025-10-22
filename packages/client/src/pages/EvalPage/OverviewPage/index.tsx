import { memo, useState } from 'react';

import Sider from '@/pages/EvalPage/OverviewPage/Sider';
import Context from '@/pages/EvalPage/OverviewPage/Content.tsx';

import { BenchmarkListRoomContextProvider } from '@/context/BenchmarkListRoomContext.tsx';
import { EvaluationListRoomContextProvider } from '@/context/EvaluationListRoomContext.tsx';

const OverviewPage = () => {
    const [selectedBenchmark, setSelectedBenchmark] = useState<string | null>(
        null,
    );

    return (
        <div className="flex flex-row w-full h-full">
            <BenchmarkListRoomContextProvider>
                <Sider
                    selectedBenchmark={selectedBenchmark}
                    onSelect={setSelectedBenchmark}
                />
            </BenchmarkListRoomContextProvider>

            <EvaluationListRoomContextProvider benchmark={selectedBenchmark}>
                <Context />
            </EvaluationListRoomContextProvider>
        </div>
    );
};

export default memo(OverviewPage);
