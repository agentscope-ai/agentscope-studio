import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs.tsx';
import { useEvaluationTaskContext } from '@/context/EvaluationTaskContext';
import { ModelCard, ToolCard } from '@/pages/EvalPage/EvaluationPage/DataCard';
import { copyToClipboard, formatNumber } from '@/utils/common';
import {
    BlockType,
    TextBlock,
    ToolResultBlock,
    ToolUseBlock,
} from '@shared/types';
import { EvalTrajectory } from '@shared/types/evaluation.ts';
import {
    Check,
    ChevronLeftIcon,
    Copy,
    CpuIcon,
    SettingsIcon,
} from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import ChartPage from './ChartPage';

import SyntaxHighlighter from 'react-syntax-highlighter';

// Copy button component
const CopyButton = memo(
    ({ text, className }: { text: string; className?: string }) => {
        const { t } = useTranslation();
        const [copied, setCopied] = useState(false);

        const handleCopy = async () => {
            const success = await copyToClipboard(text);
            if (success) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        };

        return (
            <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCopy}
                className={className}
                title={
                    copied
                        ? t('action.copySuccess')
                        : t('tooltip.button.copy-to-clipboard')
                }
            >
                {copied ? (
                    <Check className="size-4" />
                ) : (
                    <Copy className="size-4" />
                )}
            </Button>
        );
    },
);

CopyButton.displayName = 'CopyButton';

const TokenUsageCard = memo(
    ({
        inputTokens,
        outputTokens,
    }: {
        inputTokens: number;
        outputTokens: number;
    }) => {
        const { t } = useTranslation();
        return (
            <div className="rounded-xl border shadow">
                <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-1">
                    <h3 className="tracking-tight text-sm font-medium">
                        {t('common.token-usage')}
                    </h3>
                    <CpuIcon className="size-4 text-muted-foreground" />
                </div>
                <div className="p-6 min-h-[5.5rem] pt-2">
                    <div className="text-2xl font-bold">
                        {formatNumber(inputTokens + outputTokens)}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs">
                                {t('common.prompt')}
                            </span>
                            <span className="text-sm font-medium">
                                {formatNumber(inputTokens)}
                            </span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-muted-foreground text-xs">
                                {t('common.completion')}
                            </span>
                            <span className="text-sm font-medium">
                                {formatNumber(outputTokens)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    },
);

const TextStep = memo(
    ({
        block,
        stepIndex,
        isLast,
    }: {
        block: TextBlock;
        stepIndex: number;
        isLast: boolean;
    }) => {
        const { t } = useTranslation();
        return (
            <div className="flex flex-row items-start gap-4">
                <div className="flex mt-3 text-xs text-muted-foreground w-12 shrink-0">
                    {t('common.step')} {stepIndex}
                </div>
                <div className="flex flex-col items-center">
                    <div className="flex rounded-full border-blue-600 border size-8 items-center justify-center my-2">
                        <div className="rounded-full border-blue-600 border size-4"></div>
                    </div>
                    {!isLast && (
                        <div className="w-px bg-border flex-1 min-h-4"></div>
                    )}
                </div>
                <div className="flex flex-1 text-sm items-center py-2">
                    {block.text}
                </div>
            </div>
        );
    },
);

const ToolStep = memo(
    ({
        toolUseBlock,
        toolResultBlock,
        stepIndex,
        isLast,
    }: {
        toolUseBlock: ToolUseBlock;
        toolResultBlock?: ToolResultBlock;
        stepIndex: number;
        isLast: boolean;
    }) => {
        const { t } = useTranslation();
        const [isOpen, setIsOpen] = useState(false);

        const toolInputString: string[] = [];
        Object.entries(toolUseBlock.input).forEach(([key, value]) => {
            toolInputString.push(`${key}=${JSON.stringify(value)}`);
        });

        const toolUseString = `(${toolInputString.join(',\n\t')})`;

        return (
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <div className="flex flex-row items-start gap-4">
                    <div className="flex mt-3 text-xs text-muted-foreground w-12 shrink-0">
                        {t('common.step')} {stepIndex}
                    </div>
                    <div className="flex flex-col items-center">
                        <CollapsibleTrigger asChild>
                            <div className="flex rounded-full border-red-600 border size-8 items-center justify-center cursor-pointer hover:bg-muted transition-colors my-2">
                                <div className="rounded-full border-red-600 border size-4"></div>
                            </div>
                        </CollapsibleTrigger>
                        {!isLast && (
                            <div className="w-px bg-border flex-1 min-h-4"></div>
                        )}
                    </div>
                    <div className="flex flex-1 text-sm items-center overflow-x-hidden py-2">
                        <span className="font-medium text-sm mr-1">
                            {toolUseBlock.name}
                        </span>
                        <span className="truncate text-muted-foreground">
                            {toolUseString}
                        </span>
                    </div>
                </div>
                <CollapsibleContent>
                    {toolResultBlock && (
                        <div className="ml-24 mb-2 p-3 rounded-lg bg-muted/50 border">
                            <div className="text-xs text-muted-foreground mb-1">
                                {t('common.result')}:
                            </div>
                            <div className="text-sm whitespace-pre-wrap break-all max-h-64 overflow-auto">
                                {typeof toolResultBlock.output === 'string' ? (
                                    toolResultBlock.output
                                ) : (
                                    <SyntaxHighlighter
                                        language="json"
                                        customStyle={{
                                            margin: 0,
                                            borderRadius: '8px',
                                        }}
                                    >
                                        {JSON.stringify(
                                            toolResultBlock.output,
                                            null,
                                            2,
                                        )}
                                    </SyntaxHighlighter>
                                )}
                            </div>
                        </div>
                    )}
                </CollapsibleContent>
            </Collapsible>
        );
    },
);

const TrajectoryCard = memo(
    ({ input, trajectory }: { input: string; trajectory: EvalTrajectory }) => {
        const { t } = useTranslation();
        const resultMap: Record<string, ToolResultBlock> = {};
        trajectory.forEach((block) => {
            if (block.type === BlockType.TOOL_RESULT) {
                resultMap[block.id] = block;
            }
        });
        const toolSteps = trajectory.filter(
            (block) => block.type !== BlockType.TOOL_RESULT,
        );

        return (
            <Card>
                <CardHeader>
                    <CardTitle>{t('common.trajectory')}</CardTitle>
                </CardHeader>
                <CardContent>
                    {input}
                    {toolSteps.map((step, index) => {
                        const isLast = index === toolSteps.length - 1;

                        if (step.type === BlockType.TEXT) {
                            return (
                                <TextStep
                                    key={`text-${index}`}
                                    block={step}
                                    stepIndex={index + 1}
                                    isLast={isLast}
                                />
                            );
                        }

                        if (step.type === BlockType.TOOL_USE) {
                            return (
                                <ToolStep
                                    key={step.id}
                                    toolUseBlock={step}
                                    toolResultBlock={resultMap[step.id]}
                                    stepIndex={index + 1}
                                    isLast={isLast}
                                />
                            );
                        }

                        return null;
                    })}
                </CardContent>
            </Card>
        );
    },
);

const TaskPage = () => {
    const { task } = useEvaluationTaskContext();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { evalId } = useParams<{ evalId: string }>();

    const handleBackToEvaluation = () => {
        navigate(`/eval/${evalId}`);
    };

    const totalRepeats = task.total_repeats || Object.keys(task.repeats).length;
    const completedRepeats = Object.values(task.repeats).filter(
        (repeat) => repeat.solution !== undefined,
    ).length;
    const progress =
        totalRepeats > 0
            ? Math.round((completedRepeats / totalRepeats) * 100)
            : 0;

    const getStatus = () => {
        if (completedRepeats === totalRepeats) {
            return t('table.column.completed');
        }
        return t('table.column.incomplete');
    };

    return (
        <div className="flex-1 h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto px-6 py-6 space-y-6 h-full">
                {/* Header Section */}
                <div className="space-y-4">
                    <button
                        onClick={handleBackToEvaluation}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1"
                    >
                        <ChevronLeftIcon className="size-4" />
                        <span>{t('action.back-to-evaluation')}</span>
                    </button>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight">
                            {t('common.task')} {task.meta.id}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {t('common.evaluation')}: {evalId}
                        </p>
                    </div>
                </div>

                {/* Status Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="rounded-xl border shadow">
                        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-1">
                            <h3 className="tracking-tight text-sm font-medium">
                                {t('common.status')}
                            </h3>
                            <SettingsIcon className="size-4 text-muted-foreground" />
                        </div>
                        <div className="p-6 min-h-[5.5rem] pt-2 space-y-2">
                            <div className="text-2xl font-bold">
                                {getStatus()}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {t('table.column.progress')}: {progress}% (
                                {completedRepeats}/{totalRepeats})
                            </div>
                        </div>
                    </div>
                </div>

                {/* Input and Ground Truth Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('common.input')}</CardTitle>
                            <CardAction>
                                <CopyButton text={task.meta.input} />
                            </CardAction>
                        </CardHeader>
                        <CardContent className="max-h-64 overflow-auto">
                            <SyntaxHighlighter
                                language="string"
                                wrapLongLines={true}
                                customStyle={{
                                    margin: 0,
                                    borderRadius: '8px',
                                }}
                            >
                                {task.meta.input}
                            </SyntaxHighlighter>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {t('table.column.ground-truth')}
                            </CardTitle>
                            <CardAction>
                                <CopyButton
                                    text={JSON.stringify(
                                        task.meta.ground_truth,
                                        null,
                                        2,
                                    )}
                                />
                            </CardAction>
                        </CardHeader>
                        <CardContent className="max-h-64 overflow-auto">
                            <SyntaxHighlighter
                                language="json"
                                wrapLongLines={true}
                                customStyle={{
                                    margin: 0,
                                    borderRadius: '8px',
                                }}
                            >
                                {JSON.stringify(
                                    task.meta.ground_truth,
                                    null,
                                    2,
                                )}
                            </SyntaxHighlighter>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs with Overview and Repeats */}
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList>
                        <TabsTrigger value="overview">
                            {t('common.overview')}
                        </TabsTrigger>
                        {Object.keys(task.repeats).map((repeatId) => (
                            <TabsTrigger key={repeatId} value={repeatId}>
                                {`repeat ${repeatId}`}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* Overview Tab - Aggregated data */}
                    <TabsContent
                        value="overview"
                        className="flex flex-col gap-4"
                    >
                        <ChartPage />
                    </TabsContent>

                    {Object.entries(task.repeats).map(
                        ([repeatId, repeatData]) => {
                            const stats = repeatData.stats;
                            const repeatInputTokens = stats
                                ? Object.values(stats.chat_usage || {}).reduce(
                                      (acc, usage) =>
                                          acc + (usage.input_tokens || 0),
                                      0,
                                  )
                                : 0;
                            const repeatOutputTokens = stats
                                ? Object.values(stats.chat_usage || {}).reduce(
                                      (acc, usage) =>
                                          acc + (usage.output_tokens || 0),
                                      0,
                                  )
                                : 0;

                            return (
                                <TabsContent
                                    key={repeatId}
                                    value={repeatId}
                                    className="flex flex-col gap-4"
                                >
                                    {/* Stats Cards for this repeat */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <ModelCard models={stats?.llm ?? {}} />
                                        <ToolCard tools={stats?.tool ?? {}} />
                                    </div>

                                    {/* Token Usage Card for this repeat */}
                                    <TokenUsageCard
                                        inputTokens={repeatInputTokens}
                                        outputTokens={repeatOutputTokens}
                                    />

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>
                                                {t('common.output')}
                                            </CardTitle>
                                            <CardAction>
                                                <CopyButton
                                                    text={
                                                        JSON.stringify(
                                                            repeatData.solution
                                                                ?.output,
                                                            null,
                                                            2,
                                                        ) || ''
                                                    }
                                                />
                                            </CardAction>
                                        </CardHeader>
                                        <CardContent className="max-h-64 overflow-auto">
                                            <SyntaxHighlighter
                                                language="json"
                                                wrapLongLines={true}
                                                customStyle={{
                                                    margin: 0,
                                                    borderRadius: '8px',
                                                }}
                                            >
                                                {JSON.stringify(
                                                    repeatData.solution?.output,
                                                    null,
                                                    2,
                                                ) || ''}
                                            </SyntaxHighlighter>
                                        </CardContent>
                                    </Card>

                                    <TrajectoryCard
                                        input={task.meta.input}
                                        trajectory={
                                            repeatData.solution?.trajectory ||
                                            []
                                        }
                                    />
                                </TabsContent>
                            );
                        },
                    )}
                </Tabs>
            </div>
        </div>
    );
};

export default memo(TaskPage);
