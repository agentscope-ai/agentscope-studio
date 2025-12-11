import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    Command,
    SettingsIcon,
} from 'lucide-react';

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
import { RouterPath } from '@/pages/RouterPath.ts';
import SettingsDialog from './SettingsDialog.tsx';
import { getSidebarItems } from './config';

const StudioSidebar = () => {
    const { toggleSidebar, open, setOpen } = useSidebar();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const location = useLocation();
    const isInitialMount = useRef(true);

    const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

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

    const sidebarItems = getSidebarItems(t);

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
                    <SidebarGroup key={item.title} className="-mt-2">
                        <SidebarGroupLabel>
                            <span>{item.title}</span>
                        </SidebarGroupLabel>
                        {item.items.map((subItem) => (
                            <SidebarGroupContent key={subItem.title}>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            className="cursor-pointer"
                                            tooltip={subItem.title}
                                            onClick={() => {
                                                // Check if it's an external URL
                                                if (
                                                    subItem.url?.startsWith(
                                                        'http://',
                                                    ) ||
                                                    subItem.url?.startsWith(
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
            {/* Footer with version information */}
            <SidebarFooter>
                <SidebarMenuItem className="list-none">
                    <SidebarMenuButton
                        tooltip={t('common.settings')}
                        onClick={() => setSettingsDialogOpen(true)}
                    >
                        <SettingsIcon />
                        <span>{t('common.settings')}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarFooter>

            <SettingsDialog
                open={settingsDialogOpen}
                onOpenChange={setSettingsDialogOpen}
            />
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
