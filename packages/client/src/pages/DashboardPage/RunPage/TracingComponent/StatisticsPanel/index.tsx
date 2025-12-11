import { memo } from 'react';
import { Col, Flex, Row } from 'antd';
import { useTranslation } from 'react-i18next';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import StatusSection from './StatusSection';
import { MetaDataSection } from '../ShareComponents.tsx';
import { useRunRoom } from '@/context/RunRoomContext.tsx';
import { RemoveScrollBarStyle } from '@/styles.ts';
import { formatDateTime } from '@/utils/common.ts';

const StatisticsPanel = () => {
    const { runData, modelInvocationData } = useRunRoom();
    const { t } = useTranslation();

    const metadata: Record<string, string | number | undefined> = {};
    metadata[t('common.run-name')] = runData?.name;
    metadata[t('common.project')] = runData?.project;
    metadata[t('common.timestamp')] = formatDateTime(runData?.timestamp);

    const invocationData: Record<string, string | number | undefined> = {};
    invocationData[t('common.total-times')] =
        modelInvocationData?.chat.modelInvocations;
    invocationData[t('common.model-category')] =
        modelInvocationData?.chat.modelInvocationsByModel.length;

    const tokenData: Record<string, string | number | undefined> = {};
    tokenData[t('common.total')] =
        modelInvocationData?.chat.totalTokens.totalTokens;
    tokenData[t('common.prompt')] =
        modelInvocationData?.chat.totalTokens.promptTokens;
    tokenData[t('common.completion')] =
        modelInvocationData?.chat.totalTokens.completionTokens;
    tokenData[t('common.average')] = parseFloat(
        modelInvocationData?.chat.avgTokens.totalTokens.toFixed(1) || '0',
    );
    tokenData[t('common.prompt-average')] = parseFloat(
        modelInvocationData?.chat.avgTokens.promptTokens.toFixed(1) || '0',
    );
    tokenData[t('common.completion-average')] = parseFloat(
        modelInvocationData?.chat.avgTokens.completionTokens.toFixed(1) || '0',
    );

    return (
        <Flex
            vertical={true}
            style={{
                maxWidth: '100%',
                width: '100%',
                height: '100%',
                padding: 16,
                overflowX: 'hidden',
                overflowY: 'auto',
                boxSizing: 'border-box',
                ...RemoveScrollBarStyle,
            }}
            gap="large"
        >
            <StatusSection
                status={runData?.status}
                invocations={modelInvocationData?.chat.modelInvocations}
                tokens={modelInvocationData?.chat.totalTokens.totalTokens}
            />

            <MetaDataSection title={t('common.metadata')} data={metadata} />

            <MetaDataSection
                title={t('common.llm-invocation')}
                data={invocationData}
            />

            <Row gutter={0}>
                <Col
                    span={24}
                    style={{
                        height: '100%',
                        width: '100%',
                        maxWidth: '100%',
                        // TODO: handle tooltip and height overflow
                        //  at the same time
                        // overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: 12,
                        color: 'var(--muted-foreground)',
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            borderRadius: '6px 6px 0 0',
                            background: 'var(--muted-foreground)',
                            color: 'var(--muted)',
                            padding: '0 8px',
                        }}
                    >
                        {t('common.distribution')}
                    </div>

                    {modelInvocationData?.chat.modelInvocationsByModel
                        .length !== 0 ? (
                        <ResponsiveContainer
                            width="100%"
                            height={80}
                            maxHeight={500}
                            minWidth="100%"
                            style={{
                                background: 'var(--muted)',
                                borderRadius: '0 0 6px 6px',
                            }}
                        >
                            <BarChart
                                layout="vertical"
                                data={
                                    modelInvocationData?.chat
                                        .modelInvocationsByModel
                                }
                                margin={{
                                    top: 8,
                                    right: 8,
                                    left: 4,
                                    bottom: -4,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    type="number"
                                    fontSize={10}
                                    allowDecimals={false}
                                />
                                <YAxis
                                    dataKey="modelName"
                                    type="category"
                                    fontSize={10}
                                    width={60}
                                    tickFormatter={(name: string) => {
                                        if (name.length > 10) {
                                            return `${name.slice(0, 9)}...`;
                                        }
                                        return name;
                                    }}
                                />
                                <Tooltip
                                    labelStyle={{
                                        fontWeight: 500,
                                        color: 'var(--primary)',
                                    }}
                                    contentStyle={{
                                        borderRadius: 6,
                                        border: '1px solid var(--border)',
                                    }}
                                    formatter={(value) => {
                                        return [
                                            value,
                                            t('tooltip.chart.invocation'),
                                        ];
                                    }}
                                />

                                <Bar
                                    dataKey="invocations"
                                    radius={[0, 6, 6, 0]}
                                    maxBarSize={20}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div
                            style={{
                                height: 80,
                                background: 'var(--muted)',
                                borderRadius: '0 0 6px 6px',
                            }}
                        />
                    )}
                </Col>
            </Row>

            <MetaDataSection title="Token" data={tokenData} />

            <Row gutter={0}>
                <Col
                    span={24}
                    style={{
                        height: '100%',
                        width: '100%',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: 12,
                        color: 'var(--muted-foreground)',
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            borderRadius: '6px 6px 0 0',
                            background: 'var(--muted-foreground)',
                            color: 'var(--muted)',
                            padding: '0 8px',
                        }}
                    >
                        {t('common.distribution')}
                    </div>

                    {modelInvocationData?.chat.avgTokensByModel.length !== 0 ? (
                        <ResponsiveContainer
                            width="100%"
                            height={80}
                            maxHeight={500}
                            minWidth="100%"
                            style={{
                                background: 'var(--muted)',
                                borderRadius: '0 0 6px 6px',
                            }}
                        >
                            <BarChart
                                layout="vertical"
                                data={
                                    modelInvocationData?.chat.avgTokensByModel
                                }
                                margin={{
                                    top: 8,
                                    right: 8,
                                    left: 4,
                                    bottom: -4,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    type="number"
                                    fontSize={10}
                                    allowDecimals={false}
                                />
                                <YAxis
                                    dataKey="modelName"
                                    type="category"
                                    fontSize={10}
                                    tickFormatter={(name: string) => {
                                        if (name.length > 10) {
                                            return `${name.slice(0, 9)}...`;
                                        }
                                        return name;
                                    }}
                                />
                                <Tooltip
                                    labelStyle={{
                                        fontWeight: 500,
                                        color: 'var(--primary)',
                                    }}
                                    contentStyle={{
                                        borderRadius: 6,
                                        border: '1px solid var(--border)',
                                    }}
                                />
                                <Bar
                                    dataKey="promptTokens"
                                    fill="var(--muted-foreground)"
                                    maxBarSize={20}
                                    stackId="modelName"
                                />
                                <Bar
                                    dataKey="completionTokens"
                                    fill="var（--secondary-foreground)"
                                    maxBarSize={20}
                                    stackId="modelName"
                                    radius={[0, 6, 6, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div
                            style={{
                                height: 80,
                                background: 'var(--muted)',
                                borderRadius: '0 0 6px 6px',
                            }}
                        />
                    )}
                </Col>
            </Row>
        </Flex>
    );
};

export default memo(StatisticsPanel);
