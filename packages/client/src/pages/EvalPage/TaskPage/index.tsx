import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useEvaluationTaskContext } from '@/context/EvaluationTaskContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { EvalTrajectory } from '@shared/types/evaluation.ts';
import { BlockType, TextBlock, ToolResultBlock, ToolUseBlock } from '@shared/types';


const TextStep = memo(({block} : {block: TextBlock}) => {
    return <div>
        {block.text}
    </div>
});

const ToolStep = memo(({toolUseBlock, toolResultBlock}: {toolUseBlock: ToolUseBlock, toolResultBlock?: ToolResultBlock}) => {

    let toolInputString = [];
    Object.entries(toolUseBlock.input).forEach(
        ([key, value]) => {
            toolInputString.push(`${key}=${JSON.stringify(value)}`);
        }
    )

    const toolUseString = `(${toolInputString.join(",\n\t")})`;

    return <div
        className="flex flex-row items-start gap-4 py-2"
    >
        <div className="flex mt-1">
            Step
        </div>
        <div>
            <div
                className="flex rounded-full border-red-600 border size-8 items-center justify-center"
            >
                <div
                    className="rounded-full border-red-600 border size-4"
                >
                </div>
            </div>
        </div>
        <div className="flex flex-1  text-sm items-center overflow-x-hidden">
            <span className="font-medium text-sm">{toolUseBlock.name}</span><span className="truncate">{toolUseString}</span>
        </div>
    </div>
})

const TrajectoryCard = memo(({ input, trajectory }: { input: string, trajectory: EvalTrajectory }) => {
    const {t} = useTranslation();
    const resultMap: Record<string, ToolResultBlock> = {};
    trajectory.forEach(
        block => {
            if (block.type === BlockType.TOOL_RESULT) {
                resultMap[block.id] = block;
            }
        }
    )

    return <Card>
        <CardHeader>
            <CardTitle>
                {t('common.trajectory')}
            </CardTitle>
        </CardHeader>
        <CardContent>
            {input}
            {
                trajectory.map(
                    (step) => {
                        if (step.type === BlockType.TEXT) {
                            return <TextStep block={step} />;
                        }

                        if (step.type === BlockType.TOOL_USE) {
                            return <ToolStep
                                toolUseBlock={step}
                                toolResultBlock={resultMap[step.id]}
                            />;
                        }

                        return null;
                    }
                )
            }
        </CardContent>

    </Card>;
});


const TaskPage = () => {
    const { task } = useEvaluationTaskContext();
    const { t } = useTranslation();

    return (
        <div className="flex-1 h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto px-6 py-6 h-full">
                <div className="text-muted-foreground mb-2">
                    Back to evaluation
                </div>
                <div className="flex flex-col gap-1.5">
                    <div className="truncate font-bold text-xl">
                        {t('common.task')} {task.meta.id}
                    </div>
                    <div className="truncate text-sm text-muted-foreground mb-3">
                        {t('common.evaluation')}: {task.meta.id}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="col-span-1">
                        <div className="rounded-xl border shadow">
                            <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-1">
                                <h3 className="tracking-tight text-sm font-medium">
                                    {t('common.status')}
                                </h3>
                                <div className="text-muted-foreground h-4 w-4">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        className="lucide-icon lucide lucide-settings"
                                    >
                                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>

                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                </div>
                            </div>
                            <div className="p-6 min-h-[5.5rem] pt-2 space-y-4">
                                <div>Unkown</div>
                                <div>progress: 12%</div>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-full rounded-xl border shadow">
                        <div className="p-6 flex flex-col justify-between space-y-0 pb-1">
                            <h3 className="tracking-tight text-sm font-medium">
                                Input
                            </h3>
                        </div>
                        <div className="p-6 min-h-[5.5rem] pt-2 space-y-4">
                            {task.meta.input}
                        </div>
                    </div>

                    <div className="col-span-full rounded-xl border shadow">
                        <div className="p-6 flex flex-col justify-between space-y-0 pb-1">
                            <h3 className="tracking-tight text-sm font-medium">
                                Ground Truth
                            </h3>
                        </div>
                        <div className="p-6 min-h-[5.5rem] pt-2 space-y-4">
                            {JSON.stringify(task.meta.ground_truth, null, 2)}
                        </div>
                    </div>

                    {/*<Segmented*/}
                    {/*    className="col-span-full"*/}
                    {/*    options={[*/}
                    {/*        'overview',*/}
                    {/*        ...Object.keys(task.repeats).map(*/}
                    {/*            (repeatId) => `repeatId: ${repeatId}`,*/}
                    {/*        ),*/}
                    {/*    ]}*/}
                    {/*/>*/}

                    {/*<div className="col-span-full rounded-xl border shadow">*/}
                    {/*    <div className="p-6 flex flex-col justify-between space-y-0 pb-1">*/}
                    {/*        <h3 className="tracking-tight text-sm font-medium">*/}
                    {/*            Output*/}
                    {/*        </h3>*/}
                    {/*    </div>*/}
                    {/*    <div className="p-6 min-h-[5.5rem] pt-2 space-y-4"></div>*/}
                    {/*</div>*/}

                    {/*<div className="col-span-full rounded-xl border shadow">*/}
                    {/*    <div className="p-6 flex flex-col justify-between space-y-0 pb-1">*/}
                    {/*        <h3 className="tracking-tight text-sm font-medium">*/}
                    {/*            Trajectory*/}
                    {/*        </h3>*/}
                    {/*    </div>*/}
                    {/*    <div className="p-6 min-h-[5.5rem] pt-2 space-y-4"></div>*/}
                    {/*</div>*/}

                    <Tabs defaultValue="0" className="col-span-full">
                        <TabsList>
                            <TabsTrigger value="overview">
                                {t('common.overview')}
                            </TabsTrigger>
                            {
                                Object.keys(task.repeats).map((repeatId) => (
                                    <TabsTrigger
                                        key={repeatId}
                                        value={repeatId}
                                    >
                                        {`repeat ${repeatId}`}
                                    </TabsTrigger>
                                ))
                            }
                        </TabsList>
                        {
                            Object.entries(task.repeats).map(
                                ([repeatId, repeatData]) => <TabsContent
                                    value={repeatId}
                                    className="flex flex-col gap-4"
                                >
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>
                                                {t('common.stats')}
                                            </CardTitle>
                                            <CardContent>
                                                {String(repeatData.stats)}
                                            </CardContent>
                                        </CardHeader>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>
                                                {t('common.output')}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {JSON.stringify(repeatData.solution?.output) || ''}
                                        </CardContent>
                                    </Card>

                                    <TrajectoryCard input={task.meta.input} trajectory={repeatData.solution?.trajectory || []} />

                                </TabsContent>
                            )
                        }

                    </Tabs>
                </div>
            </div>
        </div>
    );
};

export default memo(TaskPage);
