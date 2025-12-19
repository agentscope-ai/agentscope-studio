import { memo, useMemo, useState } from 'react';
import { Input } from 'antd';

import AsTable from '@/components/tables/AsTable';
import {
    NumberCell,
    StatusCell,
    TextCell,
} from '@/components/tables/utils.tsx';
import { EvaluationMetaData } from '@shared/types';

interface InstancesTableProps {
    data?: EvaluationMetaData[];
}

const InstancesTable = ({ data = [] }: InstancesTableProps) => {
    const [searchText, setSearchText] = useState<string>('');

    // 根据搜索关键字过滤数据
    const filteredData = useMemo(() => {
        if (!searchText.trim()) {
            return data;
        }

        const keyword = searchText.toLowerCase().trim();
        return data.filter((record) => {
            // 搜索多个字段：id, name, status, 以及可能存在的其他字段
            const id = String(record.id || '').toLowerCase();
            const name = String(record.name || '').toLowerCase();
            const status = String(record.status || '').toLowerCase();
            // 使用 Record 类型访问可能存在的动态字段
            const recordWithExtras = record as EvaluationMetaData &
                Record<string, unknown>;
            const question = String(
                recordWithExtras.question || '',
            ).toLowerCase();
            const groundTruth = String(
                recordWithExtras.ground_truth || '',
            ).toLowerCase();

            return (
                id.includes(keyword) ||
                name.includes(keyword) ||
                status.includes(keyword) ||
                question.includes(keyword) ||
                groundTruth.includes(keyword)
            );
        });
    }, [data, searchText]);

    return (
        <div className="block">
            <div className="rounded-xl border shadow">
                <div className="flex flex-col p-4 sm:p-6 pb-0 space-y-2 sm:space-y-3">
                    <div className="font-medium text-base sm:text-lg font-semibold leading-none tracking-tight">
                        Instances
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                        <Input
                            className="w-full sm:max-w-[300px]"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            variant="filled"
                            placeholder="Please enter keywords."
                            allowClear
                        />
                        <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                            {filteredData.length} instance
                            {filteredData.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 mt-[-10px]">
                    <AsTable
                        dataSource={[
                            {
                                id: '1',
                                name: '测试实例',
                                status: 'success',
                                progress: 100,
                                createdAt: new Date().toISOString(),
                                time: 1000,
                                metrics: [],
                                repeat: 1,
                                report_dir: '/path/to/report',
                                res: 0.95,
                                steps: 10,
                                cost: 100,
                                flags: 'success',
                                tokens: 1000,
                            } as EvaluationMetaData & {
                                res: number;
                                steps: number;
                                cost: number;
                                flags: string;
                                tokens: number;
                            },
                        ]}
                        columns={[
                            {
                                key: 'id',
                                title: 'instance ID',
                                render: (value) => (
                                    <a
                                        href={`/eval/${value}/instances/${value}/detail/${value}`}
                                    >
                                        {value}
                                    </a>
                                ),
                            },
                            {
                                key: 'status',
                                title: 'Status',
                                filters: [
                                    {
                                        text: 'Success',
                                        value: 'success',
                                    },
                                    {
                                        text: 'Failed',
                                        value: 'failed',
                                    },
                                ],
                                render: (value) => (
                                    <StatusCell
                                        status={value}
                                        selected={false}
                                    />
                                ),
                            },
                            {
                                key: 'res',
                                title: 'Res %',
                                render: (value) => (
                                    <NumberCell
                                        number={
                                            typeof value === 'number'
                                                ? value
                                                : Number(value) || 0
                                        }
                                        selected={false}
                                    />
                                ),
                            },
                            {
                                key: 'steps',
                                title: 'Steps',
                                render: (value) => (
                                    <NumberCell
                                        number={
                                            typeof value === 'number'
                                                ? value
                                                : Number(value) || 0
                                        }
                                        selected={false}
                                    />
                                ),
                            },
                            {
                                key: 'cost',
                                title: 'Cost',
                                render: (value) => (
                                    <NumberCell
                                        number={
                                            typeof value === 'number'
                                                ? value
                                                : Number(value) || 0
                                        }
                                        selected={false}
                                    />
                                ),
                            },
                            {
                                key: 'flags',
                                title: 'Flags',
                                render: (value) => (
                                    <TextCell
                                        text={String(value)}
                                        selected={false}
                                    />
                                ),
                            },
                            {
                                key: 'tokens',
                                title: 'Tokens',
                                render: (value) => (
                                    <NumberCell
                                        number={
                                            typeof value === 'number'
                                                ? value
                                                : Number(value) || 0
                                        }
                                        selected={false}
                                    />
                                ),
                            },
                        ]}
                        // onRow={(record: EvaluationMetaData) => {
                        //     return {
                        //         onClick: (event: MouseEvent) => {
                        //             if (event.type === 'click') {
                        //                 navigate(
                        //                     `/eval/${record.id}/instances/${record.id}/detail/${record.id}`,
                        //                 );
                        //             }
                        //         },
                        //         style: {
                        //             cursor: 'pointer',
                        //         },
                        //     };
                        // }}
                    />
                </div>
            </div>
        </div>
    );
};

export default memo(InstancesTable);
