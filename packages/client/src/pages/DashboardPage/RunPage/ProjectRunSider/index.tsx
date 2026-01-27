import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatch, useNavigate } from 'react-router-dom';

import DeleteIcon from '@/assets/svgs/delete.svg?react';
import EyeInvisibleIcon from '@/assets/svgs/eye-invisible.svg?react';
import EyeIcon from '@/assets/svgs/eye.svg?react';

import EmptyData from '@/components/tables/EmptyData.tsx';
import { StatusCell } from '@/components/tables/utils.tsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useProjectRoom } from '@/context/ProjectRoomContext.tsx';
import { useTour } from '@/context/TourContext.tsx';
import { cn } from '@/lib/utils';
import { LogOutIcon, X } from 'lucide-react';

import { RouterPath } from '@/pages/RouterPath.ts';
import './index.css';

/**
 * Sider width configurations for folded and unfolded states.
 */
enum SiderDrawerWidth {
    UNFOLDED = '80vw',
    FOLDED = 280,
}

/**
 * Props for the project run sidebar component.
 */
interface Props {
    onRunClick: (runId: string) => void;
}

/**
 * Sidebar component for displaying and managing project runs.
 * Features card list, search, auto-focus on latest run, and tour integration.
 */
const ProjectRunSider = ({ onRunClick }: Props) => {
    const { t } = useTranslation();
    const { runs, project } = useProjectRoom();
    const { registerRunPageTourStep } = useTour();
    const navigate = useNavigate();
    const refList = useRef<HTMLDivElement>(null);

    const [folded] = useState<boolean>(true);
    const [searchText, setSearchText] = useState<string>('');
    const [focusOnLatestRun, setFocusOnLatestRun] = useState<boolean>(false);

    // Register tour step for the run list
    useEffect(() => {
        registerRunPageTourStep({
            title: t('tour.run.run-table-title'),
            description: t('tour.run.run-table-description'),
            target: refList.current,
            placement: 'right',
        });
    }, []);

    // Extract current run and project from URL
    const match = useMatch('/projects/:projectName/runs/:runId');
    const runId = match?.params?.runId;

    // Filter and sort runs
    const filteredRuns = useMemo(() => {
        let result = runs;

        // Filter by search text
        if (searchText) {
            const lowerSearch = searchText.toLowerCase();
            result = result.filter(
                (run) =>
                    run.name.toLowerCase().includes(lowerSearch) ||
                    run.id.toLowerCase().includes(lowerSearch),
            );
        }

        // Sort by timestamp (latest first) when focusOnLatestRun is enabled
        if (focusOnLatestRun) {
            result = [...result].sort((a, b) =>
                b.timestamp.localeCompare(a.timestamp),
            );
        }

        return result;
    }, [runs, searchText, focusOnLatestRun]);

    // Auto-navigate to latest run when focus mode is enabled
    useEffect(() => {
        if (focusOnLatestRun && filteredRuns.length > 0) {
            const latestRun = filteredRuns[0];
            if (latestRun.id !== runId) {
                onRunClick(latestRun.id);
            }
        }
    }, [filteredRuns, focusOnLatestRun]);

    return (
        <aside
            className="h-full z-[1] shrink-0"
            style={{ width: SiderDrawerWidth.FOLDED }}
        >
            <div
                ref={refList}
                className="animated-sider-content flex flex-col gap-4 p-4 h-full bg-background border-r border-border"
                style={{
                    width: folded
                        ? SiderDrawerWidth.FOLDED
                        : SiderDrawerWidth.UNFOLDED,
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: folded
                        ? 'none'
                        : '2px 0 8px -2px rgba(0,0,0,0.15)',
                }}
            >
                {/* Header with back button and project name */}
                <div className="flex items-center gap-2 max-w-full">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="secondary"
                                size="icon"
                                onClick={() => {
                                    navigate(RouterPath.PROJECTS);
                                }}
                            >
                                <LogOutIcon className="rotate-180 size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {t('tooltip.button.back-to-projects')}
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium">
                                {project}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            {t('common.project')}: {project}
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* Search and control buttons */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Input
                            className="pr-8"
                            placeholder={t('placeholder.search-run')}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                        {searchText && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full w-8 hover:bg-transparent"
                                onClick={() => setSearchText('')}
                            >
                                <X className="size-4 text-muted-foreground" />
                            </Button>
                        )}
                    </div>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={
                                    focusOnLatestRun ? 'default' : 'outline'
                                }
                                size="icon"
                                onClick={() =>
                                    setFocusOnLatestRun((prev) => !prev)
                                }
                            >
                                {focusOnLatestRun ? (
                                    <EyeIcon width={14} height={14} />
                                ) : (
                                    <EyeInvisibleIcon width={14} height={14} />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {t('tooltip.button.focus-on-latest-run')}
                        </TooltipContent>
                    </Tooltip>

                    {/* Delete button only shown when unfolded */}
                    {!folded && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <DeleteIcon width={13} height={13} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {t('tooltip.button.delete-selected-runs')}
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>

                <div className="flex flex-col flex-1 min-h-0 border rounded-md overflow-hidden">
                    {/* List header - styled like Table column headers */}
                    <div
                        className="px-3 py-1.5 text-sm font-medium text-muted-foreground bg-muted/50 border-b border-border shrink-0"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            gap: 8,
                            alignItems: 'center',
                        }}
                    >
                        <div className="overflow-hidden text-ellipsis select-none">
                            {t('table.column.name')}
                        </div>
                        <div className="select-none">
                            {t('table.column.status')}
                        </div>
                    </div>

                    {/* Runs card list */}
                    <ScrollArea className="flex-1 min-h-0">
                        <div>
                            {filteredRuns.length === 0 ? (
                                <EmptyData />
                            ) : (
                                filteredRuns.map((run) => (
                                    <div
                                        key={run.id}
                                        className={cn(
                                            'px-3 py-2 cursor-pointer transition-colors border-b border-border last:border-b-0',
                                            'hover:bg-muted/50',
                                            runId === run.id &&
                                                'bg-primary/10 hover:bg-primary/15',
                                        )}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr auto',
                                            gap: 8,
                                            alignItems: 'center',
                                        }}
                                        onClick={() => onRunClick(run.id)}
                                    >
                                        {/* Run name - truncated */}
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm">
                                                    {run.name}
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">
                                                <span className="text-xs break-all max-w-[300px]">
                                                    {run.name}
                                                </span>
                                            </TooltipContent>
                                        </Tooltip>

                                        {/* Status badge */}
                                        <StatusCell
                                            status={run.status}
                                            selected={false}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </aside>
    );
};

export default memo(ProjectRunSider);
