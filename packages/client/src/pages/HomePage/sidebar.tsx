import DingTalkIcon from '@/assets/svgs/dingtalk.svg?react';
import DiscordIcon from '@/assets/svgs/discord.svg?react';
import GitHubIcon from '@/assets/svgs/github.svg?react';
import { Button } from '@/components/ui/button.tsx';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar.tsx';
import { useI18n } from '@/context/I18Context.tsx';
import { RouterPath } from '@/pages/RouterPath.ts';
import {
    BookOpenIcon,
    BotIcon,
    ChartColumnStackedIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    Command,
    EarthIcon,
    FolderGit2Icon,
    // ListChecksIcon,
    RouteIcon,
    UnplugIcon,
} from 'lucide-react';
import { memo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

const StudioSidebar = () => {
    const { toggleSidebar, open, setOpen } = useSidebar();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { changeLanguage } = useI18n();
    const location = useLocation();
    const isInitialMount = useRef(true);

    // TODO: use a context to manage web storage state globally

    // Load sidebar state from localStorage on mount
    useEffect(() => {
        if (isInitialMount.current) {
            // If on overview page, always open sidebar
            if (location.pathname === RouterPath.OVERVIEW) {
                setOpen(true);
            } else {
                const savedState = localStorage.getItem('sidebar-open-state');
                if (savedState !== null) {
                    const isOpen = savedState === 'true';
                    setOpen(isOpen);
                }
            }
            isInitialMount.current = false;
        }
    }, [setOpen, location.pathname]);

    // Save sidebar state to localStorage whenever it changes (after initial mount)
    useEffect(() => {
        if (!isInitialMount.current) {
            localStorage.setItem('sidebar-open-state', String(open));
        }
    }, [open]);

    const sidebarItems = [
        {
            title: t('common.develop'),
            items: [
                {
                    title: t('common.overview'),
                    icon: ChartColumnStackedIcon,
                    url: RouterPath.OVERVIEW,
                },
                {
                    title: t('common.projects'),
                    icon: FolderGit2Icon,
                    url: RouterPath.PROJECTS,
                },
                // TODO: activate tracing and evaluation when they are ready
                {
                    title: t('common.traces'),
                    icon: RouteIcon,
                    url: RouterPath.TRACING,
                },
                // {
                //     title: t('common.evaluation'),
                //     icon: ListChecksIcon,
                //     url: RouterPath.EVAL,
                // },
            ],
        },
        {
            title: t('common.agent'),
            items: [
                {
                    title: t('common.friday'),
                    icon: BotIcon,
                    url: RouterPath.FRIDAY,
                },
            ],
        },
        {
            title: t('common.document'),
            items: [
                {
                    title: t('common.tutorial'),
                    icon: BookOpenIcon,
                    url: RouterPath.TUTORIAL,
                },
                {
                    title: t('common.api'),
                    icon: UnplugIcon,
                    url: RouterPath.API,
                },
            ],
        },
        {
            title: t('common.contact'),
            items: [
                {
                    title: t('common.github'),
                    icon: GitHubIcon,
                    url: RouterPath.GITHUB,
                },
                {
                    title: t('common.dingtalk'),
                    icon: DingTalkIcon,
                    url: RouterPath.DINGTALK,
                },
                {
                    title: t('common.discord'),
                    icon: DiscordIcon,
                    url: RouterPath.DISCORD,
                },
            ],
        },
    ];
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            tooltip="AgentScope Studio"
                        >
                            <a href="#">
                                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                    <Command className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">
                                        AgentScope
                                    </span>
                                    <span className="truncate text-xs">
                                        Studio
                                    </span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {sidebarItems.map((item) => (
                    <SidebarGroup>
                        <SidebarGroupLabel>
                            <span>{item.title}</span>
                        </SidebarGroupLabel>
                        {item.items.map((subItem) => (
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            className="cursor-pointer"
                                            tooltip={subItem.title}
                                            onClick={() => {
                                                // Check if it's an external URL
                                                if (
                                                    subItem.url.startsWith(
                                                        'http://',
                                                    ) ||
                                                    subItem.url.startsWith(
                                                        'https://',
                                                    )
                                                ) {
                                                    window.open(
                                                        subItem.url,
                                                        '_blank',
                                                        'noopener,noreferrer',
                                                    );
                                                } else {
                                                    // Handle internal routes
                                                    navigate(subItem.url);
                                                    if (open) {
                                                        setOpen(false);
                                                    }
                                                }
                                            }}
                                        >
                                            <subItem.icon />
                                            <span>{subItem.title}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        ))}
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        tooltip={t('common.changeLanguage')}
                        onClick={changeLanguage}
                    >
                        <EarthIcon />
                        <span>{t('common.language')}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarFooter>
            <Button
                data-sidebar="trigger"
                data-slot="sidebar-trigger"
                variant="outline"
                size="icon"
                className={`group-hover:flex hidden h-10 w-4 border border-border rounded-[4px] -ml-1 absolute right-0 top-1/2 transform ${open ? 'translate-x-1/2' : 'translate-x-2/3'} -translate-y-1/2`}
                onClick={toggleSidebar}
            >
                {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                <span className="sr-only">Toggle Sidebar</span>
            </Button>
        </Sidebar>
    );
};

export default memo(StudioSidebar);
