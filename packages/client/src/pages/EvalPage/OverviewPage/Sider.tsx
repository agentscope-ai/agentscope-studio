import { memo, useEffect, useState } from 'react';
import { Input, List } from 'antd';
import { useTranslation } from 'react-i18next';

import { EmptyPage } from '@/pages/DefaultPage';
import { useBenchmarkListRoom } from '@/context/BenchmarkListRoomContext.tsx';

interface Props {
    selectedBenchmark: string | null;
    onSelect: (benchmark: string) => void;
}

const Sider = ({ selectedBenchmark, onSelect }: Props) => {
    const { t } = useTranslation();
    const [searchText, setSearchText] = useState<string>('');
    const { benchmarkList } = useBenchmarkListRoom();

    useEffect(() => {
        if (selectedBenchmark === null && benchmarkList.length > 0) {
            onSelect(benchmarkList[0]);
        }
    }, [benchmarkList, selectedBenchmark]);

    return (
        <div className="flex flex-col min-w-[240px] h-full border-r border-r-border p-8 pl-4 pr-4">
            <div className="font-bold text-xl truncate mb-6 h-fit">
                {t('common.benchmark')}
            </div>

            <Input
                className="w-full"
                variant="filled"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={t('placeholder.search-benchmark')}
            />

            <div className="flex-1 overflow-auto mt-4">
                <List<string>
                    locale={{
                        emptyText: (
                            <EmptyPage size={100} title="No benchmarks" />
                        ),
                    }}
                    className="h-full"
                    dataSource={benchmarkList.filter((benchmark) =>
                        benchmark
                            .toLowerCase()
                            .includes(searchText.toLowerCase()),
                    )}
                    renderItem={(benchmark) => {
                        const isSelected = selectedBenchmark === benchmark;
                        return (
                            <div
                                className={`group ml-1 border-l border-l-zinc-200 active:text-primary-foreground p-2 pl-0 pr-3 text-[14px]`}
                                onClick={() => onSelect(benchmark)}
                            >
                                <div
                                    className={`truncate group-hover:border-l-zinc-400 border-l ${isSelected ? 'border-l-primary font-medium' : 'border-l-zinc-200'} ml-[-1px] pl-2`}
                                >
                                    {benchmark}
                                </div>
                            </div>
                        );
                    }}
                />
            </div>
        </div>
    );
};

export default memo(Sider);
