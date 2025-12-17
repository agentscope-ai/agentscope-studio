import { memo, useEffect, useState } from 'react';
import Context from '@/pages/EvalPage/OverviewPage/Content.tsx';
import Sider from '@/pages/EvalPage/OverviewPage/Sider';

import { useEvaluationRoom } from '@/context/EvaluationRoomContext.tsx';
import { Benchmark } from '@shared/types/evaluation.ts';

const OverviewPage = () => {
    const { benchmarks } = useEvaluationRoom();
    const [selectedBenchmark, setSelectedBenchmark] =
        useState<Benchmark | null>(null);

    useEffect(() => {
        setSelectedBenchmark((prev) => {
            // If the current benchmarks don't include the selected one
            if (
                prev !== null &&
                !benchmarks
                    .map((benchmark) => benchmark.name)
                    .includes(prev.name)
            ) {
                return null;
            }

            return prev;
        });
    }, [benchmarks]);

    return (
        <div className="flex flex-row w-full h-full">
            <Sider
                selectedBenchmark={
                    selectedBenchmark ? selectedBenchmark.name : null
                }
                onSelect={(benchmarkName: string) => {
                    benchmarks.forEach((benchmark) => {
                        if (benchmarkName === benchmark.name) {
                            setSelectedBenchmark(benchmark);
                        }
                    });
                }}
                benchmarkNames={benchmarks.map((benchmark) => benchmark.name)}
            />
            <Context benchmark={selectedBenchmark} />
        </div>
    );
};

export default memo(OverviewPage);
